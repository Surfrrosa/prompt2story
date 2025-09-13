function extractJsonFromContent(content) {
  const fencedMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (fencedMatch) {
    try {
      return JSON.parse(fencedMatch[1]); // Use capture group [1], not [0]
    } catch (error) {
      console.warn('Failed to parse JSON from markdown code fence:', error);
    }
  }
  
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('Failed to parse JSON from content:', error);
    }
  }
  
  return null;
}

function validateAndExtractJson(content, validator) {
  const extracted = extractJsonFromContent(content);
  
  if (!extracted) {
    return null;
  }

  return validator(extracted) ? extracted : null;
}

export { extractJsonFromContent, validateAndExtractJson };
