import { describe, it, expect } from 'vitest';
import { normalizeTitle, titleSimilarity, bestMatch } from './match';
import type { Show } from '../types';

const show = (id: number, name: string, originalName?: string): Show => ({
  id,
  name,
  originalName,
  overview: '',
  posterPath: null,
  backdropPath: null,
  firstAirDate: null,
  genres: [],
  episodeRuntime: 30,
  status: 'not_started',
  addedAt: 0,
});

describe('normalizeTitle', () => {
  it('strips articles, punctuation and trailing year', () => {
    expect(normalizeTitle('The Office (2005)')).toBe('office');
    expect(normalizeTitle('Marvel’s Daredevil')).toBe('marvel s daredevil');
  });
});

describe('titleSimilarity', () => {
  it('scores identical titles as 1', () => {
    expect(titleSimilarity('Breaking Bad', 'breaking bad')).toBe(1);
  });
  it('scores substring matches highly', () => {
    expect(titleSimilarity('The Mandalorian', 'Mandalorian')).toBeGreaterThan(0.85);
  });
  it('scores unrelated titles low', () => {
    expect(titleSimilarity('Chernobyl', 'Friends')).toBeLessThan(0.4);
  });
});

describe('bestMatch', () => {
  it('picks the closest candidate', () => {
    const candidates = [
      show(1, 'Friends'),
      show(2, 'Stranger Things'),
      show(3, 'Breaking Bad'),
    ];
    const { show: m, score } = bestMatch('breaking bad', candidates);
    expect(m?.id).toBe(3);
    expect(score).toBe(1);
  });

  it('matches on original (non-latin) name too', () => {
    const candidates = [show(8, 'Attack on Titan', '進撃の巨人')];
    const { score } = bestMatch('進撃の巨人', candidates);
    expect(score).toBe(1);
  });
});
