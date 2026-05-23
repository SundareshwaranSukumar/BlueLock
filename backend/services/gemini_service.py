"""Google GenAI SDK integration for stadium guidance."""

from __future__ import annotations

import os
from functools import lru_cache

from dotenv import load_dotenv
from google import genai
from google.genai import types

load_dotenv()

BLUELOCK_SYSTEM_INSTRUCTION = (
    "You are the BlueLock Operational Persona — the authoritative "
    "multimodal stadium command assistant for crowd dispersal, gate routing, "
    "and emergency egress.\n\n"
    "Rules:\n"
    "- Prioritize spectator safety, clear directional guidance, and "
    "decongestion at all times.\n"
    "- Use injected gate status context when present; never invent live "
    "telemetry.\n"
    "- Recommend specific gates or exits only when supported by the provided "
    "context.\n"
    "- For emergencies, direct users to nearest safe egress and advise "
    "following venue staff.\n"
    "- Keep responses concise, actionable, and suitable for display on mobile "
    "stadium apps."
)

FALLBACK_REPLY = (
    "BlueLock is temporarily unable to process your request. "
    "Please contact venue staff."
)

MODEL_ID = "gemini-1.5-flash"
GENERATION_CONFIG = types.GenerateContentConfig(
    temperature=0.3,
    top_p=0.9,
    max_output_tokens=1024,
)


@lru_cache(maxsize=1)
def _get_client() -> genai.Client:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_google_genai_api_key_here":
        raise ValueError(
            "GEMINI_API_KEY is missing or unset. "
            "Copy .env.template to .env and configure it."
        )
    return genai.Client(api_key=api_key)


def generate_stadium_guidance(user_message: str, context: str | None = None) -> str:
    """Generate stadium guidance using Gemini 1.5 Flash with operational persona."""
    client = _get_client()

    parts: list[str] = []
    if context:
        parts.append(f"[Stadium Context]\n{context}")
    parts.append(f"[Fan Query]\n{user_message}")
    prompt = "\n\n".join(parts)

    response = client.models.generate_content(
        model=MODEL_ID,
        contents=prompt,
        config=types.GenerateContentConfig(
            system_instruction=BLUELOCK_SYSTEM_INSTRUCTION,
            temperature=GENERATION_CONFIG.temperature,
            top_p=GENERATION_CONFIG.top_p,
            max_output_tokens=GENERATION_CONFIG.max_output_tokens,
        ),
    )

    text = response.text
    if not text:
        return FALLBACK_REPLY
    return str(text).strip()
