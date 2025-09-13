export function extractJsonFromContent(content: string): any | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
  
  if (!jsonMatch) {
    return null;
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.warn('Failed to parse JSON from content:', error);
    return null;
  }
}

export function validateAndExtractJson<T>(
  content: string,
  validator: (data: any) => data is T
): T | null {
  const extracted = extractJsonFromContent(content);
  
  if (!extracted) {
    return null;
  }

  return validator(extracted) ? extracted : null;
}
