export interface ChatTextPartLike {
  type?: string;
  text?: string;
}

export interface ChatTextMessageLike {
  content?: string;
  parts?: ChatTextPartLike[];
}

export function extractChatMessageText(message: ChatTextMessageLike): string {
  if (typeof message.content === 'string' && message.content.length > 0) {
    return message.content;
  }

  if (!Array.isArray(message.parts) || message.parts.length === 0) {
    return '';
  }

  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text || '')
    .join('');
}

export function normalizeChatTypography(text: string): string {
  return text
    .replace(/[\u2018\u2019\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010\u2011\u2012\u2013\u2014\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '');
}
