import json
import os
from pathlib import Path

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

load_dotenv()

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
CLIENTS_DIR = Path(__file__).parent / "clients"

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Thrive Chatbot API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    client_id: str
    conversation_history: list = []


class ChatResponse(BaseModel):
    response: str
    conversation_history: list


def load_client_config(client_id: str) -> dict:
    config_path = CLIENTS_DIR / f"{client_id}.json"
    if not config_path.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Client '{client_id}' not found. Ensure clients/{client_id}.json exists.",
        )
    with open(config_path) as f:
        return json.load(f)


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    if isinstance(exc, HTTPException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"error": exc.detail},
        )
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred. Please try again."},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("20/hour")
async def chat(request: Request, body: ChatRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY is not configured.")

    config = load_client_config(body.client_id)
    system_prompt = config.get("system_prompt", "You are a helpful assistant.")

    updated_history = list(body.conversation_history) + [
        {"role": "user", "content": body.message}
    ]

    try:
        client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
        api_response = client.messages.create(
            model="claude-haiku-4-5",
            max_tokens=1024,
            system=system_prompt,
            messages=updated_history,
        )
    except anthropic.APIStatusError as e:
        raise HTTPException(status_code=502, detail=f"Upstream API error: {e.message}")
    except anthropic.APIConnectionError:
        raise HTTPException(status_code=503, detail="Could not reach the AI service. Please try again.")

    assistant_message = api_response.content[0].text

    updated_history.append({"role": "assistant", "content": assistant_message})

    return ChatResponse(response=assistant_message, conversation_history=updated_history)
