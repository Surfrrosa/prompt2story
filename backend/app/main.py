from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
import json
import base64
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="User Story Generator API")

# Disable CORS. Do not remove this for full-stack development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

openai_client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def load_prompt():
    try:
        with open("prompts/user_story_prompt.md", "r") as f:
            return f.read()
    except FileNotFoundError:
        return """You are an expert product manager and business analyst. Convert the provided unstructured text into well-structured user stories, acceptance criteria, and edge cases.

Return a JSON object with this structure:
{
  "user_stories": [
    {
      "title": "Brief title",
      "story": "As a [user], I want [goal] so that [benefit]",
      "acceptance_criteria": ["Given [context], when [action], then [outcome]"]
    }
  ],
  "edge_cases": ["Description of edge case"]
}"""

class TextInput(BaseModel):
    text: str
    include_metadata: bool = False
    infer_edge_cases: bool = True
    include_advanced_criteria: bool = True
    expand_all_components: bool = True

class UserStory(BaseModel):
    title: str
    story: str
    acceptance_criteria: list[str]
    tags: dict[str, str] = None

class GenerationResponse(BaseModel):
    user_stories: list[UserStory]
    edge_cases: list[str]

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/generate-user-stories", response_model=GenerationResponse)
async def generate_user_stories(input_data: TextInput):
    try:
        if not input_data.text.strip():
            raise HTTPException(status_code=400, detail="Input text cannot be empty")
        
        prompt_template = load_prompt()
        
        if input_data.include_metadata:
            prompt_template += "\n\nIMPORTANT: Include detailed metadata tags in your response with priority, type, component, effort, and persona fields for each user story."
        
        if input_data.infer_edge_cases:
            prompt_template += "\n\nEDGE CASES: Infer and include comprehensive edge cases, boundary conditions, and error scenarios for each user story."
        
        if input_data.include_advanced_criteria:
            prompt_template += "\n\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story covering normal flow, error handling, edge cases, different states, accessibility, and performance considerations."
        
        if input_data.expand_all_components:
            prompt_template += "\n\nCOMPREHENSIVE ANALYSIS: Scan and analyze ALL mentioned components, features, and requirements. Do not limit analysis arbitrarily - be thorough and complete."
        
        full_prompt = f"{prompt_template}\n\nUnstructured text to analyze:\n{input_data.text}"
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a senior Product Owner and business analyst. Be thorough and comprehensive in your analysis."},
                {"role": "user", "content": full_prompt}
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        content = response.choices[0].message.content
        
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                result = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError):
            result = {
                "user_stories": [
                    {
                        "title": "Generated User Story",
                        "story": content[:200] + "..." if len(content) > 200 else content,
                        "acceptance_criteria": ["Please review the generated content for specific criteria"]
                    }
                ],
                "edge_cases": ["Please review the generated content for edge cases"]
            }
        
        return GenerationResponse(**result)
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

def load_design_prompt():
    try:
        with open("prompts/design_analysis_prompt.md", "r") as f:
            return f.read()
    except FileNotFoundError:
        return """Analyze this design mockup and generate user stories based on the UI elements you can identify. Focus on interactive elements like buttons, forms, navigation, and user workflows."""

@app.post("/analyze-design", response_model=GenerationResponse)
async def analyze_design(
    file: UploadFile = File(...), 
    include_metadata: bool = False,
    infer_edge_cases: bool = True,
    include_advanced_criteria: bool = True,
    expand_all_components: bool = True
):
    try:
        if not file.content_type or not file.content_type.startswith(('image/', 'application/pdf')):
            raise HTTPException(status_code=400, detail="Only image files (PNG, JPG) and PDF files are supported")
        
        file_content = await file.read()
        if len(file_content) > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        base64_image = base64.b64encode(file_content).decode('utf-8')
        
        prompt_template = load_design_prompt()
        
        if include_metadata:
            prompt_template += "\n\nIMPORTANT: Include detailed metadata tags in your response with priority, type, component, effort, and persona fields for each user story."
        
        if infer_edge_cases:
            prompt_template += "\n\nEDGE CASES: Infer and include comprehensive edge cases, boundary conditions, and error scenarios for each UI element and interaction."
        
        if include_advanced_criteria:
            prompt_template += "\n\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story covering normal flow, error handling, edge cases, responsive behavior, accessibility, and interaction states."
        
        if expand_all_components:
            prompt_template += "\n\nCOMPREHENSIVE UI ANALYSIS: Systematically scan and analyze ALL visible UI components, interactive elements, and interface areas. Do not limit analysis arbitrarily - be thorough and complete."
        
        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a senior Product Owner and UX analyst. Be thorough and comprehensive in your design analysis."},
                {
                    "role": "user", 
                    "content": [
                        {"type": "text", "text": prompt_template},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{file.content_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            temperature=0.7,
            max_tokens=4000
        )
        
        content = response.choices[0].message.content
        
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                result = json.loads(json_str)
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError):
            result = {
                "user_stories": [
                    {
                        "title": "Design Analysis Generated",
                        "story": content[:200] + "..." if len(content) > 200 else content,
                        "acceptance_criteria": ["Please review the generated content for specific criteria"]
                    }
                ],
                "edge_cases": ["Please review the generated content for edge cases"]
            }
        
        return GenerationResponse(**result)
        
    except openai.OpenAIError as e:
        raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")
