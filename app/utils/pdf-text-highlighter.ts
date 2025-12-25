// app/utils/pdf-text-highlighter.ts
/**
 * PDF Text Highlighter Utility
 * 
 * Provides functionality to search and highlight text within PDF.js TextLayer.
 * Used to highlight evidence quotes from AI feedback directly in the rendered PDF.
 */

export interface HighlightOptions {
  text: string;              // Text to highlight
  color: string;             // Highlight color (CSS color value)
  pageNumber: number;        // Page number
  highlightId: string;       // Unique ID for this highlight (used for removal)
}

export class PDFTextHighlighter {
  private highlightedElements: Map<string, HTMLElement[]> = new Map();

  /**
   * Search and highlight text in the PDF TextLayer
   * @returns true if text was found and highlighted, false otherwise
   */
  highlightText(textLayerElement: HTMLElement, options: HighlightOptions): boolean {
    const { text, color, highlightId } = options;
    
    console.log('[Highlighter] Starting highlight:', { 
      text: text.substring(0, 50) + '...', 
      color, 
      highlightId 
    });
    
    // 1. Clean the quote text (remove quotation marks and extra whitespace)
    const cleanText = text.replace(/[「」『』""]/g, '').trim();
    
    if (!cleanText) {
      console.warn('[Highlighter] Clean text is empty');
      return false;
    }
    
    console.log('[Highlighter] Clean text:', cleanText.substring(0, 100));
    
    // 2. Get all text spans in the TextLayer
    const textSpans = textLayerElement.querySelectorAll('span');
    
    console.log(`[Highlighter] Found ${textSpans.length} text spans`);
    
    if (textSpans.length === 0) {
      console.warn('[Highlighter] No text spans found');
      return false;
    }
    
    // 3. Search for text and collect matching spans
    const matches = this.findTextInSpans(textSpans, cleanText);
    
    console.log(`[Highlighter] Found ${matches.length} matching spans`);
    
    if (matches.length === 0) {
      console.warn('[Highlighter] No matches found');
      // Log the first few spans for debugging
      const sampleText = Array.from(textSpans).slice(0, 5)
        .map(s => s.textContent)
        .join(' ');
      console.log('[Highlighter] Sample PDF text:', sampleText);
      return false;
    }
    
    // 4. Apply highlight styles to matched elements
    const highlightedEls: HTMLElement[] = [];
    matches.forEach((span, index) => {
      span.classList.add('pdf-highlight', `highlight-${highlightId}`);
      (span as HTMLElement).style.backgroundColor = color;
      (span as HTMLElement).style.transition = 'background-color 0.3s ease';
      highlightedEls.push(span as HTMLElement);
      console.log(`[Highlighter] Highlighted span ${index}:`, span.textContent);
    });
    
    console.log(`[Highlighter] Successfully highlighted ${highlightedEls.length} elements`);
    
    // 5. Store reference for later removal
    this.highlightedElements.set(highlightId, highlightedEls);
    
    return true;
  }

  /**
   * Remove a specific highlight by ID
   */
  removeHighlight(highlightId: string): void {
    const elements = this.highlightedElements.get(highlightId);
    if (!elements) return;
    
    elements.forEach(el => {
      el.classList.remove('pdf-highlight', `highlight-${highlightId}`);
      el.style.backgroundColor = '';
    });
    
    this.highlightedElements.delete(highlightId);
    console.log(`[Highlighter] Removed highlight: ${highlightId}`);
  }

  /**
   * Clear all highlights
   */
  clearAllHighlights(): void {
    const count = this.highlightedElements.size;
    this.highlightedElements.forEach((_, id) => {
      this.removeHighlight(id);
    });
    console.log(`[Highlighter] Cleared ${count} highlights`);
  }

  /**
   * Search for text across multiple span elements
   * Supports searching text that spans across multiple spans
   * 
   * @private
   */
  private findTextInSpans(spans: NodeListOf<Element>, searchText: string): Element[] {
    const matches: Element[] = [];
    let concatenatedText = '';
    let spanMap: { span: Element; startIndex: number; endIndex: number }[] = [];
    
    // Build a map of spans to their text positions
    spans.forEach(span => {
      const text = span.textContent || '';
      const startIndex = concatenatedText.length;
      concatenatedText += text;
      const endIndex = concatenatedText.length;
      spanMap.push({ span, startIndex, endIndex });
    });
    
    console.log('[Highlighter] Total PDF text length:', concatenatedText.length);
    console.log('[Highlighter] Search text length:', searchText.length);
    
    // Normalize whitespace for better matching
    const normalizedConcatenated = concatenatedText.replace(/\s+/g, ' ').trim();
    const normalizedSearch = searchText.replace(/\s+/g, ' ').trim();
    
    // Find the search text position
    const searchIndex = normalizedConcatenated.indexOf(normalizedSearch);
    
    console.log('[Highlighter] Search index:', searchIndex);
    
    if (searchIndex === -1) {
      console.log('[Highlighter] Exact match not found, trying fuzzy...');
      // Try fuzzy matching (allow for minor differences)
      return this.fuzzyFindTextInSpans(spanMap, concatenatedText, searchText);
    }
    
    const searchEnd = searchIndex + normalizedSearch.length;
    
    // Find all spans that overlap with the search range
    spanMap.forEach(({ span, startIndex, endIndex }) => {
      // Check if this span overlaps with the search range
      if (endIndex > searchIndex && startIndex < searchEnd) {
        matches.push(span);
      }
    });
    
    return matches;
  }

  /**
   * Fuzzy search for text (allows for minor differences in whitespace)
   * @private
   */
  private fuzzyFindTextInSpans(
    spanMap: { span: Element; startIndex: number; endIndex: number }[],
    fullText: string,
    searchText: string
  ): Element[] {
    console.log('[Highlighter] Attempting fuzzy match...');
    
    // Try to find the text with relaxed matching
    const searchWords = searchText.split(/\s+/).filter(w => w.length > 0);
    
    if (searchWords.length === 0) return [];
    
    // Look for the first few words to get a starting position
    const firstWords = searchWords.slice(0, Math.min(3, searchWords.length)).join('');
    const startIndex = fullText.indexOf(firstWords);
    
    console.log('[Highlighter] Fuzzy search - first words:', firstWords);
    console.log('[Highlighter] Fuzzy search - start index:', startIndex);
    
    if (startIndex === -1) {
      // Try even more relaxed matching - just the first significant word
      const firstSignificantWord = searchWords.find(w => w.length > 2);
      if (firstSignificantWord) {
        const relaxedIndex = fullText.indexOf(firstSignificantWord);
        console.log('[Highlighter] Trying first significant word:', firstSignificantWord, 'at', relaxedIndex);
        
        if (relaxedIndex !== -1) {
          const matches: Element[] = [];
          const searchLength = searchText.length;
          const endIdx = relaxedIndex + searchLength + 50; // Larger buffer
          
          spanMap.forEach(({ span, startIndex: spanStart, endIndex: spanEnd }) => {
            if (spanEnd > relaxedIndex && spanStart < endIdx) {
              matches.push(span);
            }
          });
          
          return matches;
        }
      }
      return [];
    }
    
    // Find spans around this position
    const matches: Element[] = [];
    const searchLength = searchText.length;
    const endIndex = startIndex + searchLength + 20; // Add some buffer
    
    spanMap.forEach(({ span, startIndex: spanStart, endIndex: spanEnd }) => {
      if (spanEnd > startIndex && spanStart < endIndex) {
        matches.push(span);
      }
    });
    
    console.log('[Highlighter] Fuzzy match found', matches.length, 'spans');
    
    return matches;
  }

  /**
   * Get all currently highlighted element IDs
   */
  getHighlightedIds(): string[] {
    return Array.from(this.highlightedElements.keys());
  }

  /**
   * Check if a specific highlight exists
   */
  hasHighlight(highlightId: string): boolean {
    return this.highlightedElements.has(highlightId);
  }
}

/**
 * Get highlight color based on criteria name
 */
export function getHighlightColor(criteriaName: string): string {
  const colorMap: Record<string, string> = {
    '句子結構': 'rgba(59, 130, 246, 0.4)',   // Blue
    '邏輯連貫': 'rgba(34, 197, 94, 0.4)',    // Green
    '主題深度': 'rgba(168, 85, 247, 0.4)',   // Purple
    '細節支持': 'rgba(251, 146, 60, 0.4)',   // Orange
    '文法正確': 'rgba(236, 72, 153, 0.4)',   // Pink
    '詞彙運用': 'rgba(14, 165, 233, 0.4)',   // Sky blue
  };
  
  // Default to yellow if criteria not found
  return colorMap[criteriaName] || 'rgba(234, 179, 8, 0.4)';
}
