import json
import os
from pathlib import Path
from typing import Any

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, field_validator
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

MODEL = "claude-haiku-4-5-20251001"
CLIENTS_DIR = Path(__file__).parent / "clients"

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="AI Chatbot Service",
    version="1.0.0",
    docs_url="/docs",
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class ConversationMessage(BaseModel):
    role: str
    content: str

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        if v not in ("user", "assistant"):
            raise ValueError("role must be 'user' or 'assistant'")
        return v


class ChatRequest(BaseModel):
    message: str
    client_id: str
    conversation_history: list[ConversationMessage] = []

    @field_validator("message")
    @classmethod
    def message_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("message must not be empty")
        return v

    @field_validator("client_id")
    @classmethod
    def client_id_safe(cls, v: str) -> str:
        # Prevent path traversal
        if not v.replace("-", "").replace("_", "").isalnum():
            raise ValueError("client_id contains invalid characters")
        return v


class ChatResponse(BaseModel):
    response: str
    conversation_history: list[ConversationMessage]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_client_config(client_id: str) -> dict[str, Any]:
    """Load client JSON config, raising 404 if not found."""
    client_file = CLIENTS_DIR / f"{client_id}.json"
    if not client_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Client '{client_id}' not found.",
        )
    with open(client_file, "r", encoding="utf-8") as f:
        return json.load(f)


def get_anthropic_client() -> anthropic.AsyncAnthropic:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="Server misconfiguration: ANTHROPIC_API_KEY is not set.",
        )
    return anthropic.AsyncAnthropic(api_key=api_key)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "An internal server error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("20/hour")
async def chat(request: Request, body: ChatRequest):
    """
    Send a message and receive a response from the AI assistant configured
    for the specified client. Maintains full conversation context.
    """
    client_config = load_client_config(body.client_id)
    system_prompt = client_config.get("system_prompt", "You are a helpful assistant.")

    messages: list[dict[str, str]] = [
        {"role": msg.role, "content": msg.content}
        for msg in body.conversation_history
    ]
    messages.append({"role": "user", "content": body.message})

    anthropic_client = get_anthropic_client()

    try:
        api_response = await anthropic_client.messages.create(
            model=MODEL,
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
    except anthropic.AuthenticationError:
        raise HTTPException(
            status_code=500,
            detail="Invalid Anthropic API key. Please contact support.",
        )
    except anthropic.RateLimitError:
        raise HTTPException(
            status_code=429,
            detail="The AI service is temporarily rate-limited. Please try again in a moment.",
        )
    except anthropic.BadRequestError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Bad request to AI service: {exc.message}",
        )
    except anthropic.APIStatusError:
        raise HTTPException(
            status_code=502,
            detail="The AI service returned an unexpected error. Please try again.",
        )

    assistant_text = ""
    for block in api_response.content:
        if block.type == "text":
            assistant_text = block.text
            break

    updated_history = list(body.conversation_history)
    updated_history.append(ConversationMessage(role="user", content=body.message))
    updated_history.append(ConversationMessage(role="assistant", content=assistant_text))

    return ChatResponse(
        response=assistant_text,
        conversation_history=updated_history,
    )
