export interface SubmissionTextNormalizationResult {
  cleanText: string;
  cleanToRaw: number[];
  rawToClean: number[];
  cleanIndexToRaw: (index: number) => number;
  rawIndexToClean: (index: number) => number;
}

function isLineBreakAt(value: string, index: number): boolean {
  const char = value[index];
  return char === '\n' || char === '\r';
}

function consumeLineBreak(value: string, index: number): number {
  if (value[index] === '\r' && value[index + 1] === '\n') {
    return index + 2;
  }

  return index + 1;
}

function getPreviousVisibleChar(value: string, index: number): string | null {
  for (let cursor = index - 1; cursor >= 0; cursor -= 1) {
    const char = value[cursor];
    if (char === '\n' || char === '\r') {
      continue;
    }

    return char;
  }

  return null;
}

function getNextVisibleChar(value: string, index: number): string | null {
  for (let cursor = index; cursor < value.length; cursor += 1) {
    const char = value[cursor];
    if (char === '\n' || char === '\r') {
      continue;
    }

    return char;
  }

  return null;
}

function isCjkCharacter(char: string | null): boolean {
  return Boolean(char && /\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}|\p{Script=Hangul}/u.test(char));
}

function isAsciiWordCharacter(char: string | null): boolean {
  return Boolean(char && /[A-Za-z0-9]/.test(char));
}

function shouldInsertSpaceBetween(leftChar: string | null, rightChar: string | null): boolean {
  if (!leftChar || !rightChar) {
    return false;
  }

  if (isCjkCharacter(leftChar) || isCjkCharacter(rightChar)) {
    return false;
  }

  return isAsciiWordCharacter(leftChar) && isAsciiWordCharacter(rightChar);
}

function clampIndex(index: number, max: number): number {
  if (Number.isNaN(index)) {
    return 0;
  }

  return Math.max(0, Math.min(max, index));
}

function setRawBoundaryRange(rawToClean: number[], start: number, end: number, cleanIndex: number) {
  for (let rawIndex = start; rawIndex <= end; rawIndex += 1) {
    rawToClean[rawIndex] = cleanIndex;
  }
}

function appendMappedSegment(
  cleanParts: string[],
  cleanToRaw: number[],
  rawToClean: number[],
  fragment: string,
  rawStart: number,
  rawEnd: number,
  cleanLength: number
): number {
  const rawSpan = rawEnd - rawStart;
  cleanParts.push(fragment);

  if (fragment.length === 0) {
    setRawBoundaryRange(rawToClean, rawStart, rawEnd, cleanLength);
    return cleanLength;
  }

  cleanToRaw[cleanLength] = rawStart;

  for (let cleanOffset = 1; cleanOffset <= fragment.length; cleanOffset += 1) {
    const rawOffset = rawStart + Math.min(rawSpan, Math.round((cleanOffset * rawSpan) / fragment.length));
    cleanToRaw[cleanLength + cleanOffset] = rawOffset;
  }

  for (let rawOffset = rawStart; rawOffset <= rawEnd; rawOffset += 1) {
    const cleanOffset = rawSpan === 0 ? 0 : Math.floor(((rawOffset - rawStart) * fragment.length) / rawSpan);
    rawToClean[rawOffset] = cleanLength + cleanOffset;
  }

  return cleanLength + fragment.length;
}

export function normalizeSubmissionText(rawText: string): SubmissionTextNormalizationResult {
  const cleanParts: string[] = [];
  const cleanToRaw: number[] = [0];
  const rawToClean: number[] = new Array(rawText.length + 1).fill(0);
  let rawIndex = 0;
  let cleanLength = 0;

  while (rawIndex < rawText.length) {
    if (!isLineBreakAt(rawText, rawIndex)) {
      const codePoint = rawText.codePointAt(rawIndex) ?? 0;
      const nextRawIndex = rawIndex + (codePoint > 0xffff ? 2 : 1);
      cleanLength = appendMappedSegment(
        cleanParts,
        cleanToRaw,
        rawToClean,
        rawText.slice(rawIndex, nextRawIndex),
        rawIndex,
        nextRawIndex,
        cleanLength
      );
      rawIndex = nextRawIndex;
      continue;
    }

    const lineBreakStart = rawIndex;
    let logicalBreakCount = 0;

    while (rawIndex < rawText.length && isLineBreakAt(rawText, rawIndex)) {
      rawIndex = consumeLineBreak(rawText, rawIndex);
      logicalBreakCount += 1;
    }

    const lineBreakEnd = rawIndex;

    if (logicalBreakCount >= 2) {
      cleanLength = appendMappedSegment(
        cleanParts,
        cleanToRaw,
        rawToClean,
        '\n'.repeat(logicalBreakCount),
        lineBreakStart,
        lineBreakEnd,
        cleanLength
      );
      continue;
    }

    const previousChar = getPreviousVisibleChar(rawText, lineBreakStart);
    const nextChar = getNextVisibleChar(rawText, lineBreakEnd);
    const replacement = shouldInsertSpaceBetween(previousChar, nextChar) ? ' ' : '';

    cleanLength = appendMappedSegment(
      cleanParts,
      cleanToRaw,
      rawToClean,
      replacement,
      lineBreakStart,
      lineBreakEnd,
      cleanLength
    );
  }

  cleanToRaw[cleanLength] = rawText.length;
  rawToClean[rawText.length] = cleanLength;

  const cleanText = cleanParts.join('');

  return {
    cleanText,
    cleanToRaw,
    rawToClean,
    cleanIndexToRaw: (index: number) => cleanToRaw[clampIndex(index, cleanText.length)] ?? rawText.length,
    rawIndexToClean: (index: number) => rawToClean[clampIndex(index, rawText.length)] ?? cleanText.length,
  };
}

export function createIdentitySubmissionTextNormalization(text: string): SubmissionTextNormalizationResult {
  const boundaries = Array.from({ length: text.length + 1 }, (_, index) => index);

  return {
    cleanText: text,
    cleanToRaw: boundaries,
    rawToClean: boundaries,
    cleanIndexToRaw: (index: number) => clampIndex(index, text.length),
    rawIndexToClean: (index: number) => clampIndex(index, text.length),
  };
}
