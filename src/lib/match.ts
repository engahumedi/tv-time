import type { Show } from '../types';

/** Normalize a title for comparison: lowercase, strip punctuation & articles. */
export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip combining diacritics
    .replace(/\(\d{4}\)/g, '') // drop a trailing year like "(2016)"
    .replace(/[^\p{L}\p{N}\s]/gu, ' ') // keep any unicode letter/number
    .replace(/\b(the|a|an)\b/g, ' ') // drop English articles
    .replace(/\s+/g, ' ')
    .trim();
}

/** Levenshtein distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  let curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/** Similarity in [0,1]. 1 = identical after normalization. */
export function titleSimilarity(a: string, b: string): number {
  const na = normalizeTitle(a);
  const nb = normalizeTitle(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.9;
  const dist = levenshtein(na, nb);
  const maxLen = Math.max(na.length, nb.length);
  return 1 - dist / maxLen;
}

/**
 * Choose the best candidate for a target name. Returns the match plus a
 * confidence score; callers decide whether the score clears their bar.
 */
export function bestMatch(
  target: string,
  candidates: Show[],
): { show: Show | null; score: number } {
  let best: Show | null = null;
  let bestScore = 0;
  for (const c of candidates) {
    const score = Math.max(
      titleSimilarity(target, c.name),
      c.originalName ? titleSimilarity(target, c.originalName) : 0,
    );
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return { show: best, score: bestScore };
}

/** The confidence threshold above which we auto-accept a match. */
export const AUTO_MATCH_THRESHOLD = 0.72;
