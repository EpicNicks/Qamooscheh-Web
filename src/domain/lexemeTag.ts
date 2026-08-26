// Lexeme tags are the natural key both exercises and the lexeme index share
// (e.g. `سلام<interj><spoken>`) — a display surface form followed by
// `<...>` attribute markers (part of speech, register). The markers are
// internal bookkeeping, never meant to reach the UI as text.
export interface ParsedLexemeTag {
  surface: string;
  attributes: string[];
}

export function parseLexemeTag(tag: string): ParsedLexemeTag {
  const firstAngle = tag.indexOf("<");
  if (firstAngle < 0) return { surface: tag, attributes: [] };

  const surface = tag.slice(0, firstAngle);
  const attributes = [...tag.matchAll(/<([^>]+)>/g)].map((m) => m[1]);
  return { surface, attributes };
}
