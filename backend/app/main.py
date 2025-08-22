"""
Prompt2Story Backend (FastAPI)
- CORS configured for Fly.io + frontend hosts
- Robust JSON-only generation with resilient parsing
- Organized constants, helpers, and routes
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
            f\"{', '.join(missing)}. Please copy .env.example to .env and add your API keys.\"
        )

validate_environment()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("prompt2story")

# Models: you can override via env if needed
TEXT_MODEL_PRIMARY = os.getenv("TEXT_MODEL", "gpt-4o")
JSON_MODEL_PRIMARY = os.getenv("JSON_MODEL", "gpt-4o-mini")

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

def load_prompt() -> str:
    """
    User story generation prompt. If file is missing, return a sane default.
    """
    try:
        with open("prompts/user_story_prompt.md", "r") as f:
            return f.read()
    except FileNotFoundError:
        return (
            "You are an expert product manager and business analyst. "
            "Convert the provided unstructured text into well-structured user stories, "
            "acceptance criteria, and edge cases."
        )

def load_design_prompt() -> str:
    """
    Design analysis prompt. If file is missing, return a default.
    """
    try:
        with open("prompts/design_analysis_prompt.md", "r") as f:
            return f.read()
    except FileNotFoundError:
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
    """
    Be resilient to models that occasionally wrap JSON in prose or fences.
    """
    # 1) Try direct JSON
    try:
        return json.loads(content)
    except Exception:
        pass

    # 2) Try fenced ```json ... ``` blocks
    m = re.search(r"```(?:json)?\\s*(\\{.*?\\})\\s*```", content, flags=re.S)
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
                    text += page_text + "\\n"
            except Exception:
                continue

        if not text.strip():
            raise HTTPException(status_code=400, detail="PDF contains no extractable text")

        return text.strip()

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

# -----------------------------------------------------------------------------
# Error handler & health
# -----------------------------------------------------------------------------

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled exception on %s: %s", request.url, exc, exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check server logs for details."},
    )

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

# -----------------------------------------------------------------------------
# Routes
# -----------------------------------------------------------------------------

@app.post("/generate-user-stories", response_model=GenerationResponse)
async def generate_user_stories(input_data: TextInput):
    if not input_data.text.strip():
        raise HTTPException(status_code=400, detail="Input text cannot be empty")

    prompt = load_prompt()

    if input_data.include_metadata:
        prompt += (
            "\\n\\nIMPORTANT: Include detailed metadata in your response with priority "
            "(Low/Medium/High), type (Feature|Bug|Chore|Enhancement|Accessibility), component, "
            "effort, and persona (End User/Admin/Support Agent/Engineer/Designer/QA/Customer/Other)."
        )
    if input_data.infer_edge_cases:
        prompt += (
            "\\n\\nEDGE CASES: Infer and include comprehensive edge cases, boundary conditions, "
            "and error scenarios for each user story."
        )
    if input_data.include_advanced_criteria:
        prompt += (
            "\\n\\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story covering "
            "normal flow, error handling, edge cases, different states, accessibility, and performance."
        )
    if input_data.expand_all_components:
        prompt += (
            "\\n\\nCOMPREHENSIVE ANALYSIS: Scan and analyze ALL mentioned components, features, and "
            "requirements. Be thorough and complete."
        )

    full_prompt = f"{prompt}\\n\\n{JSON_INSTRUCTIONS}\\n\\nUnstructured text to analyze:\\n{input_data.text}"

    content = call_openai_json(
        messages=[
            {"role": "system", "content": "You are a senior Product Owner and business analyst. Output only valid JSON."},
            {"role": "user", "content": full_prompt},
        ],
        temperature=0.2,
    )

    try:
        result = extract_json_from_content(content)
        return GenerationResponse(**result)
    except Exception:
        # Fallback so UI still shows something
        excerpt = content[:200] + "..." if len(content) > 200 else content
        return GenerationResponse(
            user_stories=[UserStory(
                title="Generated User Story",
                story=excerpt,
                acceptance_criteria=["Please review the generated content for specific criteria"],
            )],
            edge_cases=["Please review the generated content for edge cases"],
        )

@app.post("/regenerate-story", response_model=UserStory)
async def regenerate_story(request: RegenerateRequest):
    if not request.original_input.strip():
        raise HTTPException(status_code=400, detail="Original input cannot be empty")

    regen_prompt = f"""You are a senior Product Owner. Regenerate and improve a single user story.

ORIGINAL INPUT:
{request.original_input}

CURRENT STORY:
Title: {request.current_story.title}
Story: {request.current_story.story}
Acceptance Criteria: {', '.join(request.current_story.acceptance_criteria)}

INSTRUCTIONS:
1. Analyze the original input to understand the full context.
2. Improve the current story to be more specific, actionable, and comprehensive.
3. Generate 3-5 detailed acceptance criteria using proper Gherkin (Given/When/Then).
4. Ensure the story addresses the core need from the original input.
5. Make the story more testable and implementable than the current version.

Return this JSON only:
{{
  "title": "Improved title",
  "story": "As a [user], I want [goal] so that [benefit]",
  "acceptance_criteria": [
    "Given [context], when [action], then [outcome]",
    "Given [failure], when [action], then [error handling]",
    "Given [edge case], when [action], then [behavior]"
  ]{',' if request.include_metadata else ''}
{('  \"metadata\": {\"priority\": \"Low|Medium|High\", \"type\": \"Feature|Bug|Chore|Enhancement\", \"component\": \"string\", \"effort\": \"string\", \"persona\": \"End User|Admin|Support Agent|Engineer|Designer|QA|Customer|Other\", \"persona_other\": \"string|null\" }' if request.include_metadata else '')}
}}"""

    content = call_openai_json(
        messages=[
            {"role": "system", "content": "You are a senior Product Owner. Output only valid JSON."},
            {"role": "user", "content": regen_prompt},
        ],
        temperature=0.2,
        max_tokens=2000,
    )

    try:
        result = extract_json_from_content(content)
        # validate required fields
        for key in ("title", "story", "acceptance_criteria"):
            if key not in result:
                raise ValueError(f"Missing required field '{key}' in regenerated story")
        return UserStory(**result)
    except Exception:
        return UserStory(
            title=f"Improved: {request.current_story.title}",
            story=request.current_story.story,
            acceptance_criteria=[
                "Given the system is operational, when the user performs the action, then the expected outcome occurs",
                "Given an error condition, when the user attempts the action, then appropriate error handling is provided",
                "Given edge case scenarios, when the user interacts with the feature, then the system behaves predictably",
            ],
            metadata=request.current_story.metadata,
        )

@app.post("/analyze-design", response_model=GenerationResponse)
async def analyze_design(
    file: UploadFile = File(...),
    include_metadata: bool = Form(False),
    infer_edge_cases: bool = Form(True),
    include_advanced_criteria: bool = Form(True),
    expand_all_components: bool = Form(True),
):
    if not file.content_type or not file.content_type.startswith(("image/", "application/pdf")):
        raise HTTPException(status_code=400, detail="Only image files (PNG, JPG) and PDF files are supported")

    file_content = await file.read()
    if len(file_content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail=f"File size must be less than {MAX_UPLOAD_MB}MB")

    if file.content_type == "application/pdf":
        pdf_text = extract_pdf_text(file_content)
        prompt = load_prompt()

        if include_metadata:
            prompt += "\\n\\nIMPORTANT: Include detailed metadata (priority/type/component/effort/persona) for each story."
        if infer_edge_cases:
            prompt += "\\n\\nEDGE CASES: Include comprehensive edge cases for each story."
        if include_advanced_criteria:
            prompt += "\\n\\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story."
        if expand_all_components:
            prompt += "\\n\\nCOMPREHENSIVE ANALYSIS: Analyze ALL mentioned components and requirements."

        full_prompt = f"{prompt}\\n\\n{JSON_INSTRUCTIONS}\\n\\nExtracted text from PDF document:\\n{pdf_text}"

        content = call_openai_json(
            messages=[
                {"role": "system", "content": "You are a senior Product Owner and business analyst. Output only valid JSON."},
                {"role": "user", "content": full_prompt},
            ],
            temperature=0.2,
        )

    else:
        # Image branch
        base64_image = base64.b64encode(file_content).decode("utf-8")
        prompt = load_design_prompt()

        if include_metadata:
            prompt += "\\n\\nIMPORTANT: Include detailed metadata (priority/type/component/effort/persona) for each story."
        if infer_edge_cases:
            prompt += "\\n\\nEDGE CASES: Include comprehensive edge cases for each UI element and interaction."
        if include_advanced_criteria:
            prompt += "\\n\\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story (normal flow, errors, responsive, a11y, states)."
        if expand_all_components:
            prompt += "\\n\\nCOMPREHENSIVE UI ANALYSIS: Analyze ALL visible UI components and interactions."

        prompt_with_rules = f"{prompt}\\n\\n{JSON_INSTRUCTIONS}"

        content = call_openai_json(
            messages=[
                {"role": "system", "content": "You are a senior Product Owner and UX analyst. Output only valid JSON."},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt_with_rules},
                        {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_image}"}},
                    ],
                },
            ],
            temperature=0.2,
        )

    try:
        result = extract_json_from_content(content)
        return GenerationResponse(**result)
    except Exception:
        excerpt = content[:200] + "..." if len(content) > 200 else content
        return GenerationResponse(
            user_stories=[UserStory(
                title="Document Analysis Generated",
                story=excerpt,
                acceptance_criteria=["Please review the generated content for specific criteria"],
            )],
            edge_cases=["Please review the generated content for edge cases"],
        )

