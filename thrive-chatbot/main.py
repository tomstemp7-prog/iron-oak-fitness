import json
import os
from pathlib import Path
from typing import Any

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

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
if not ANTHROPIC_API_KEY:
    raise RuntimeError("ANTHROPIC_API_KEY environment variable is not set")

MODEL = "claude-haiku-4-5-20251001"
CLIENTS_DIR = Path(__file__).parent / "clients"

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Thrive Chatbot API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

anthropic_client = anthropic.AsyncAnthropic(api_key=ANTHROPIC_API_KEY)


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    client_id: str
    conversation_history: list[Message] = []


class ChatResponse(BaseModel):
    response: str
    conversation_history: list[Message]


def load_client_config(client_id: str) -> dict[str, Any]:
    client_file = CLIENTS_DIR / f"{client_id}.json"
    if not client_file.exists():
        raise HTTPException(
            status_code=404,
            detail=f"Client '{client_id}' not found",
        )
    with open(client_file, "r", encoding="utf-8") as f:
        return json.load(f)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
@limiter.limit("20/hour")
async def chat(request: Request, body: ChatRequest):
    client_config = load_client_config(body.client_id)
    system_prompt = client_config["system_prompt"]

    messages = [
        {"role": msg.role, "content": msg.content}
        for msg in body.conversation_history
    ]
    messages.append({"role": "user", "content": body.message})

    response = await anthropic_client.messages.create(
        model=MODEL,
        max_tokens=1024,
        system=system_prompt,
        messages=messages,
    )

    assistant_text = ""
    for block in response.content:
        if block.type == "text":
            assistant_text = block.text
            break

    updated_history = list(body.conversation_history)
    updated_history.append(Message(role="user", content=body.message))
    updated_history.append(Message(role="assistant", content=assistant_text))

    return ChatResponse(
        response=assistant_text,
        conversation_history=updated_history,
    )


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
        content={"error": "An internal server error occurred"},
    )
