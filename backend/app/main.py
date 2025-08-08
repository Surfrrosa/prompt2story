from fastapi import FastAPI, HTTPException, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import openai
import os
import json
import base64
import PyPDF2
import io
from dotenv import load_dotenv

load_dotenv()

class Metadata(BaseModel):
    priority: str
    type: str
    component: str
    effort: str
    persona: str
    persona_other: Optional[str] = None

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
    metadata: Optional[Metadata] = None

class GenerationResponse(BaseModel):
    user_stories: list[UserStory]
    edge_cases: list[str]

class RegenerateRequest(BaseModel):
    original_input: str
    current_story: UserStory
    include_metadata: bool = False

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
            prompt_template += "\n\nIMPORTANT: Include detailed metadata in your response with priority (Low/Medium/High), type (Feature/Bug/Chore/Enhancement), component, effort, and persona (End User/Admin/Support Agent/Engineer/Designer/QA/Customer/Other) fields for each user story."
        
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
        print(f"DEBUG: Raw AI response: {content}")
        
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                print(f"DEBUG: Extracted JSON: {json_str}")
                result = json.loads(json_str)
                print(f"DEBUG: Parsed result: {result}")
                print(f"DEBUG: First story metadata: {result.get('user_stories', [{}])[0].get('metadata', 'NOT_FOUND')}")
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"DEBUG: JSON parsing failed: {e}")
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

@app.post("/regenerate-story", response_model=UserStory)
async def regenerate_story(request: RegenerateRequest):
    try:
        if not request.original_input.strip():
            raise HTTPException(status_code=400, detail="Original input cannot be empty")
        
        regeneration_prompt = f"""You are a senior Product Owner. Your task is to regenerate and improve a single user story based on the original input and current story provided.

ORIGINAL INPUT:
{request.original_input}

CURRENT STORY TO IMPROVE:
Title: {request.current_story.title}
Story: {request.current_story.story}
Acceptance Criteria: {', '.join(request.current_story.acceptance_criteria)}

INSTRUCTIONS:
1. Analyze the original input to understand the full context
2. Improve the current story by making it more specific, actionable, and comprehensive
3. Generate 3-5 detailed acceptance criteria using proper Gherkin format (Given/When/Then)
4. Ensure the story addresses the core need from the original input
5. Make the story more testable and implementable than the current version

Return a JSON object with this structure:
{{
  "title": "Improved title of the user story",
  "story": "As a [user], I want [goal] so that [benefit]",
  "acceptance_criteria": [
    "Given [context], when [action], then [outcome]",
    "Given [failure scenario], when [action], then [error handling]", 
    "Given [edge case], when [action], then [expected behavior]"
  ]"""

        if request.include_metadata:
            regeneration_prompt += """,
  "metadata": {
    "priority": "Low|Medium|High",
    "type": "Feature|Bug|Chore|Enhancement",
    "component": "form|admin|ui|api|etc",
    "effort": "1 day|3 days|1 week|etc",
    "persona": "End User|Admin|Support Agent|Engineer|Designer|QA|Customer|Other",
    "persona_other": "custom persona if Other selected"
  }"""

        regeneration_prompt += """
}

Focus on making this story better than the original by being more specific, comprehensive, and actionable."""

        response = openai_client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a senior Product Owner focused on creating high-quality, actionable user stories. Improve the given story while maintaining its core intent."},
                {"role": "user", "content": regeneration_prompt}
            ],
            temperature=0.7,
            max_tokens=2000
        )
        
        content = response.choices[0].message.content
        print(f"DEBUG: Raw regeneration response: {content}")
        
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                print(f"DEBUG: Extracted JSON: {json_str}")
                result = json.loads(json_str)
                print(f"DEBUG: Parsed regenerated story: {result}")
                
                if not all(key in result for key in ['title', 'story', 'acceptance_criteria']):
                    raise ValueError("Missing required fields in regenerated story")
                
                return UserStory(**result)
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"DEBUG: JSON parsing failed: {e}")
            return UserStory(
                title=f"Improved: {request.current_story.title}",
                story=request.current_story.story,
                acceptance_criteria=[
                    "Given the system is operational, when the user performs the action, then the expected outcome occurs",
                    "Given an error condition, when the user attempts the action, then appropriate error handling is provided",
                    "Given edge case scenarios, when the user interacts with the feature, then the system behaves predictably"
                ],
                metadata=request.current_story.metadata
            )
        
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

def extract_pdf_text(file_content: bytes) -> str:
    """Extract text from PDF file using PyPDF2 with robust error handling."""
    try:
        pdf_file = io.BytesIO(file_content)
        
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file, strict=False)
        except Exception as e:
            pdf_file.seek(0)
            try:
                pdf_reader = PyPDF2.PdfReader(pdf_file)
            except Exception:
                raise HTTPException(status_code=400, detail="PDF file appears to be corrupted or in an unsupported format")
        
        text = ""
        try:
            for page_num, page in enumerate(pdf_reader.pages):
                try:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
                except Exception as e:
                    continue
        except Exception as e:
            raise HTTPException(status_code=400, detail="Unable to extract text from PDF pages")
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="PDF file appears to be empty or contains no extractable text")
            
        return text.strip()
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF processing error: {str(e)}")

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
        
        if file.content_type == 'application/pdf':
            pdf_text = extract_pdf_text(file_content)
            
            if not pdf_text.strip():
                raise HTTPException(status_code=400, detail="PDF file appears to be empty or contains no extractable text")
            
            prompt_template = load_prompt()
            
            if include_metadata:
                prompt_template += "\n\nIMPORTANT: Include detailed metadata in your response with priority (Low/Medium/High), type (Feature/Bug/Chore/Enhancement), component, effort, and persona (End User/Admin/Support Agent/Engineer/Designer/QA/Customer/Other) fields for each user story."
            
            if infer_edge_cases:
                prompt_template += "\n\nEDGE CASES: Infer and include comprehensive edge cases, boundary conditions, and error scenarios for each user story."
            
            if include_advanced_criteria:
                prompt_template += "\n\nADVANCED CRITERIA: Generate 5-7 detailed acceptance criteria per story covering normal flow, error handling, edge cases, different states, accessibility, and performance considerations."
            
            if expand_all_components:
                prompt_template += "\n\nCOMPREHENSIVE ANALYSIS: Scan and analyze ALL mentioned components, features, and requirements. Do not limit analysis arbitrarily - be thorough and complete."
            
            full_prompt = f"{prompt_template}\n\nExtracted text from PDF document to analyze:\n{pdf_text}"
            
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a senior Product Owner and business analyst. Be thorough and comprehensive in your analysis."},
                    {"role": "user", "content": full_prompt}
                ],
                temperature=0.7,
                max_tokens=4000
            )
            
        else:
            base64_image = base64.b64encode(file_content).decode('utf-8')
            
            prompt_template = load_design_prompt()
            
            if include_metadata:
                prompt_template += "\n\nIMPORTANT: Include detailed metadata in your response with priority (Low/Medium/High), type (Feature/Enhancement/Accessibility), component, effort, and persona (End User/Admin/Support Agent/Engineer/Designer/QA/Customer/Other) fields for each user story."
            
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
        print(f"DEBUG: Raw AI response: {content}")
        
        try:
            start_idx = content.find('{')
            end_idx = content.rfind('}') + 1
            if start_idx != -1 and end_idx != 0:
                json_str = content[start_idx:end_idx]
                print(f"DEBUG: Extracted JSON: {json_str}")
                result = json.loads(json_str)
                print(f"DEBUG: Parsed result: {result}")
                print(f"DEBUG: First story metadata: {result.get('user_stories', [{}])[0].get('metadata', 'NOT_FOUND')}")
            else:
                raise ValueError("No JSON found in response")
        except (json.JSONDecodeError, ValueError) as e:
            print(f"DEBUG: JSON parsing failed: {e}")
            result = {
                "user_stories": [
                    {
                        "title": "Document Analysis Generated",
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
