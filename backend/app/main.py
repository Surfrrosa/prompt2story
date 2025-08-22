"""
Prompt2Story Backend (FastAPI) — Vision two-step JSON pipeline
- CORS configured for Fly.io + frontend hosts
- Robust JSON-only generation with resilient parsing
- Two-step image analysis: (1) vision outline (no JSON), (2) strict JSON conversion
"""

from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
import os
import io
import re
import json
import base64
import logging

import PyPDF2
from dotenv import load_dotenv
import openai

# -----------------------------------------------------------------------------
# Environment & Config
# -----------------------------------------------------------------------------

load_dotenv()

def validate_environment() -> None:
    """Validate that all required environment variables are set."""
    required_vars = ["OPENAI_API_KEY"]
    missing = [v for v in required_vars if not os.getenv(v)]
    if missing:
        raise ValueError(
            "Missing required environment variables: "
            f"{', '.join(missing)}. Please add your API keys to the environment."
        )

validate_environment()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prompt2story")

# Models: you can override via env if needed
TEXT_MODEL_PRIMARY = os.getenv("TEXT_MODEL", "gpt-4o")
JSON_MODEL_PRIMARY = os.getenv("JSON_MODEL", "gpt-4o-mini")  # vision-capable

# Upload size
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# App init
app = FastAPI(title="User Story Generator API")

# --- CORS ---------------------------------------------------------------------
# Option A (default): permissive for quick unblock (no credentials).
# Option B (prod): set ALLOWED_ORIGINS="https://your-site,https://your-preview.vercel.app"
origins_env = os.getenv("ALLOWED_ORIGINS", "").strip()
if origins_env:
    ALLOWED_ORIGINS = [o.strip() for o in origins_env.split(",") if o.strip()]
    ALLOW_CREDENTIALS = True
else:
    ALLOWED_ORIGINS = ["*"]
    ALLOW_CREDENTIALS = False  # must be False when allow_origins=["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=ALLOW_CREDENTIALS,
)

# OpenAI client
openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# -----------------------------------------------------------------------------
# Data Models
# -----------------------------------------------------------------------------

class Metadata(BaseModel):
    priority: str
    type: str
    component: str
    effort: str
    persona: str
    persona_other: Optional[str] = None

class TextInput(BaseModel):
    text: str
    include_metadata: bool = False
    infer_edge_cases: bool = True
    include_advanced_criteria: bool = True
    expand_all_components: bool = True

class UserStory(BaseModel):
    title: str
    story: str
    acceptance_criteria: List[str]
    metadata: Optional[Metadata] = None

class GenerationResponse(BaseModel):
    user_stories: List[UserStory]
    edge_cases: List[str]

class RegenerateRequest(BaseModel):
    original_input: str
    current_story: UserStory
    include_metadata: bool = False

# -----------------------------------------------------------------------------
# Prompts & Helpers
# -----------------------------------------------------------------------------

def _read_first_existing(paths) -> str:
    for p in paths:
        try:
            with open(p, "r") as f:
                return f.read()
        except FileNotFoundError:
            continue
    return ""

def load_prompt() -> str:
    """Load the user-story prompt from common locations; fall back to a sane default."""
    content = _read_first_existing([
        "prompts/user_story_prompt.md",
        "user_story_prompt.md",
        "user-stories (3).md",  # legacy
    ])
    if content:
        return content
    return (
        "You are an expert product manager and business analyst. "
        "Convert the provided unstructured text into well-structured user stories, "
        "acceptance criteria, and edge cases."
    )

def load_design_prompt() -> str:
    """Design analysis prompt. Supports prompts/ and repo root."""
    content = _read_first_existing([
        "prompts/design_analysis_prompt.md",
        "design_analysis_prompt.md",
    ])
    if content:
        return content
    return (
        "Analyze this design mockup and generate user stories based on the UI elements "
        "you can identify. Focus on interactive elements like buttons, forms, navigation, "
        "and user workflows."
    )

JSON_INSTRUCTIONS = """
Return ONLY a valid JSON object matching exactly this schema—no preamble, no markdown, no code fences:

{
  "user_stories": [
    {
      "title": "string",
      "story": "string",
      "acceptance_criteria": ["string", "..."],
      "metadata": {
        "priority": "Low|Medium|High",
        "type": "Feature|Bug|Chore|Enhancement|Accessibility",
        "component": "string",
        "effort": "string",
        "persona": "End User|Admin|Support Agent|Engineer|Designer|QA|Customer|Other",
        "persona_other": "string|null"
      }
    }
  ],
  "edge_cases": ["string", "..."]
}
"""

def extract_json_from_content(content: str) -> dict:
    """Be resilient to models that occasionally wrap JSON in prose or fences."""
    # 1) Try direct JSON
    try:
        return json.loads(content)
    except Exception:
        pass

    # 2) Try fenced ```json ... ``` blocks
    m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, flags=re.S)
    if m:
        return json.loads(m.group(1))

    # 3) Sandwich between first '{' and last '}'
    start = content.find("{")
    end = content.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(content[start : end + 1])

    raise ValueError("No valid JSON object found in model output")

def call_openai_json(messages, model_json: str = JSON_MODEL_PRIMARY,
                     model_fallback: str = TEXT_MODEL_PRIMARY,
                     temperature: float = 0.2, max_tokens: int = 4000) -> str:
    """
    Attempt to request JSON output; fall back gracefully if response_format isn't supported.
    Returns the message content.
    """
    try:
        resp = openai_client.chat.completions.create(
            model=model_json,
            response_format={"type": "json_object"},
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning("JSON mode failed on %s (%s). Falling back to regular call.",
                       model_json, e)
        resp = openai_client.chat.completions.create(
            model=model_fallback,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
        )
        return resp.choices[0].message.content

def extract_pdf_text(file_content: bytes) -> str:
    """Extract text from a PDF using PyPDF2 with robust error handling."""
    try:
        pdf_file = io.BytesIO(file_content)
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file, strict=False)
        except Exception:
            pdf_file.seek(0)
            pdf_reader = PyPDF2.PdfReader(pdf_file)  # best-effort second try

        text = ""
        for page in getattr(pdf_reader, "pages", []):
            try:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            except Exception:
                continue

        if not text.strip():
            raise HTTPException(status_code=400, detail="PDF contains no extractable text")

        return text.strip()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

def get_vision_outline(base64_image: str, content_type: str, prompt_text: str) -> str:
    """
    First pass: ask the model to extract a concise, structured outline of the UI.
    No JSON here—just bullets/sections so the next pass can be forced into JSON mode.
    """
    vision_messages = [
        {
            "role": "system",
            "content": (
                "You are a senior UX analyst. Extract a concise, structured outline of UI sections, "
                "key elements, and likely user actions. Use terse bullets. No JSON. No paragraphs."
            ),
        },
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt_text + "\n\nTASK: Outline the UI (bulleted sections, elements, actions)."},
                {"type": "image_url", "image_url": {"url": f"data:{content_type};base64,{base64_image}"}},
            ],
        },
    ]

    resp = openai_client.chat.completions.create(
        model=JSON_MODEL_PRIMARY,  # e.g., gpt-4o-mini (vision-capable)
        messages=vision_messages,
        temperature=0.2,
        max_tokens=2000,
    )
    return resp.choices[0].message.content.strip()

# -----------------------------------------------------------------------------
# Error handler & health
# -----------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url, exc, exc_info=Tru_

