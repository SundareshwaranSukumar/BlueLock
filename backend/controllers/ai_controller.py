"""AI stadium assistant orchestration."""

from __future__ import annotations

from config.gate_state import build_context_snapshot
from models.schemas import ChatMessage, ChatResponse
from services.gemini_service import MODEL_ID, generate_stadium_guidance


def stadium_assistant(payload: ChatMessage) -> ChatResponse:
    context_parts: list[str] = [build_context_snapshot()]
    if payload.context:
        context_parts.append(payload.context)
    merged_context = "\n\n".join(context_parts)

    reply = generate_stadium_guidance(
        user_message=payload.user_message,
        context=merged_context,
    )

    return ChatResponse(
        reply=reply,
        model=MODEL_ID,
        session_id=payload.session_id,
    )
