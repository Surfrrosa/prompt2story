import sys
import os
sys.path.append('app')
from main import load_prompt
import openai
from dotenv import load_dotenv
import json

load_dotenv()
client = openai.OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

test_input = '''So, we've had a couple of users report that when they submit the form, it just hangs. Might be some kind of edge case tied to network retries or error messages not rendering. We'll need to double-check form validation too — especially mobile. Also, we forgot to account for new roles added to the admin panel last sprint — permissions aren't being respected properly. 

John said localization isn't showing for French, but only in the pricing table and CTA button. Probably missing some keys.

Also let's not forget: the modal should auto-dismiss after success, which it currently doesn't — user gets stuck. And QA noticed we're not logging failed submissions for diagnostics. That's all I have unless anyone else has more.'''

prompt_template = load_prompt()
full_prompt = f'{prompt_template}\n\nUnstructured text to analyze:\n{test_input}'

print('=== TESTING ENHANCED PROMPT ===')
print(f'Input length: {len(test_input)} characters')
print('Expected issues: 6-7 distinct stories')
print()

expected_issues = [
    "Form submission hanging",
    "Form validation issues (mobile)",
    "Admin panel permissions not respecting new roles", 
    "French localization missing in pricing table",
    "French localization missing in CTA button",
    "Modal not auto-dismissing after success",
    "Missing logging for failed submissions"
]

print('Expected distinct issues:')
for i, issue in enumerate(expected_issues, 1):
    print(f'{i}. {issue}')
print()

try:
    response = client.chat.completions.create(
        model='gpt-4o',
        messages=[
            {'role': 'system', 'content': 'You are an expert product manager and business analyst.'},
            {'role': 'user', 'content': full_prompt}
        ],
        temperature=0.7,
        max_tokens=2000
    )
    
    content = response.choices[0].message.content
    print('=== GPT-4O RESPONSE ===')
    
    start_idx = content.find('{')
    end_idx = content.rfind('}') + 1
    if start_idx != -1 and end_idx != 0:
        json_str = content[start_idx:end_idx]
        result = json.loads(json_str)
        
        print(f'Generated {len(result["user_stories"])} user stories:')
        for i, story in enumerate(result['user_stories'], 1):
            print(f'{i}. {story["title"]}')
            if 'tags' in story and story['tags']:
                print(f'   Tags: {story["tags"]}')
            print(f'   Story: {story["story"]}')
            print(f'   Acceptance Criteria: {len(story["acceptance_criteria"])} items')
            print()
        
        print(f'Edge cases: {len(result.get("edge_cases", []))}')
        
        if len(result['user_stories']) >= 6:
            print('✅ SUCCESS: Generated expected number of stories (6+)')
        else:
            print(f'❌ ISSUE: Only generated {len(result["user_stories"])} stories, expected 6-7')
            
    else:
        print('❌ No JSON found in response')
        print(content)
        
except Exception as e:
    print(f'❌ Error: {e}')
