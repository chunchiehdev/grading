import { UIRubricDataSchema, type UIRubricData } from '@/schemas/rubric';

/**
 * Parsed rubric message content
 */
export interface ParsedRubricContent {
  /**
   * The validated rubric data extracted from JSON
   */
  rubricData: UIRubricData | null;
  /**
   * The display text with JSON code blocks removed
   */
  displayText: string;
  /**
   * Whether JSON was found and parsed successfully
   */
  hasRubric: boolean;
  /**
   * Parsing error message if validation failed
   */
  error?: string;
}

/**
 * Extracts JSON code blocks from markdown text
 * Supports both ```json and ``` formats
 */
function extractJsonFromMarkdown(text: string): string | null {
  // Try to find ```json code blocks first
  const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonBlockMatch) {
    return jsonBlockMatch[1].trim();
  }

  // Try generic ``` code blocks that might contain JSON
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim();
    // Check if it looks like JSON (starts with { or [)
    if (content.startsWith('{') || content.startsWith('[')) {
      return content;
    }
  }

  // Try to find raw JSON objects in the text
  const jsonObjectMatch = text.match(/(\{[\s\S]*\})/);
  if (jsonObjectMatch) {
    try {
      // Verify it's valid JSON before returning
      JSON.parse(jsonObjectMatch[1]);
      return jsonObjectMatch[1];
    } catch {
      // Not valid JSON, continue
    }
  }

  return null;
}

/**
 * Removes JSON code blocks from text
 */
function removeJsonBlocks(text: string): string {
  // Remove ```json blocks
  let cleaned = text.replace(/```json\s*[\s\S]*?```/g, '');
  // Remove generic ``` blocks that look like JSON
  cleaned = cleaned.replace(/```\s*\{[\s\S]*?\}[\s\S]*?```/g, '');
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();
  return cleaned;
}

/**
 * Parses AI response text and extracts rubric data if present
 *
 * @param content - The AI response text that may contain JSON rubric data
 * @returns Parsed content with rubric data and display text separated
 *
 * @example
 * ```typescript
 * const result = parseRubricFromMessage(aiResponse);
 * if (result.hasRubric) {
 *   console.log('Found rubric:', result.rubricData);
 *   console.log('Display text:', result.displayText);
 * }
 * ```
 */
export function parseRubricFromMessage(content: string): ParsedRubricContent {
  // Extract JSON from markdown code blocks
  const jsonString = extractJsonFromMarkdown(content);

  if (!jsonString) {
    return {
      rubricData: null,
      displayText: content,
      hasRubric: false,
    };
  }

  try {
    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate against rubric schema
    const validationResult = UIRubricDataSchema.safeParse(parsed);

    if (!validationResult.success) {
      // JSON found but doesn't match rubric schema
      return {
        rubricData: null,
        displayText: content,
        hasRubric: false,
        error: `Invalid rubric format: ${validationResult.error.message}`,
      };
    }

    // Successfully parsed and validated
    const displayText = removeJsonBlocks(content);

    return {
      rubricData: validationResult.data,
      displayText: displayText || '成功生成評分標準',
      hasRubric: true,
    };
  } catch (error) {
    // JSON parsing failed
    return {
      rubricData: null,
      displayText: content,
      hasRubric: false,
      error: error instanceof Error ? error.message : 'Failed to parse JSON',
    };
  }
}

/**
 * Batch parse multiple messages
 */
export function parseRubricMessages(
  messages: Array<{ content: string; role: string }>
): Array<{ content: string; role: string; parsed?: ParsedRubricContent }> {
  return messages.map((msg) => {
    if (msg.role === 'assistant') {
      return {
        ...msg,
        parsed: parseRubricFromMessage(msg.content),
      };
    }
    return msg;
  });
}
