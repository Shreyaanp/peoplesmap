import type { ExtractedTag, TagLevel } from '../../api/types';

/** A tag on its way into your profile: born from the sentence (with a span) or added by hand. */
export interface TagDraft {
  slug: string;
  display: string;
  level: TagLevel;
  /** Where its words sit in the sentence, for Tag Birth. */
  span?: [number, number];
}

export function fromExtracted(tags: readonly ExtractedTag[]): TagDraft[] {
  return tags.map(({ slug, display, level, spans }) => ({
    slug,
    display,
    level,
    ...(spans[0] ? { span: spans[0] } : {}),
  }));
}

const nextLevel: Record<TagLevel, TagLevel> = { learning: 'doing', doing: 'teaching', teaching: 'learning' };

export function cycleLevel(level: TagLevel): TagLevel {
  return nextLevel[level];
}

/** The sentence cut into plain text and the words each tag was born from, in order. */
export function sentencePieces(sentence: string, tags: readonly TagDraft[]) {
  const spans = tags
    .flatMap((tag) => (tag.span ? [{ slug: tag.slug, start: tag.span[0], end: tag.span[1] }] : []))
    .toSorted((a, b) => a.start - b.start);
  const pieces: { text: string; slug?: string }[] = [];
  let at = 0;
  for (const span of spans) {
    if (span.start < at) continue;
    if (span.start > at) pieces.push({ text: sentence.slice(at, span.start) });
    pieces.push({ text: sentence.slice(span.start, span.end), slug: span.slug });
    at = span.end;
  }
  if (at < sentence.length) pieces.push({ text: sentence.slice(at) });
  return pieces;
}
