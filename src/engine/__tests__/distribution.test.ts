import { describe, expect, it } from 'vitest';
import { ATHLETES } from '../../data/athletes';
import { athletesByRarity, baseValueOf, statsOf, overallOf, ultiOf, dropWeight, RARITY_ORDER } from '../cards';

describe('base de données', () => {
  it('a des identifiants uniques', () => {
    const ids = new Set(ATHLETES.map((a) => a.id));
    expect(ids.size).toBe(ATHLETES.length);
  });

  it('répartit les raretés de façon pyramidale', () => {
    const byRarity = athletesByRarity();
    const counts = Object.fromEntries(Object.entries(byRarity).map(([k, v]) => [k, v.length]));
    console.log('Répartition', counts, 'total', ATHLETES.length);
    expect(counts.legendaire).toBeLessThan(counts.epique);
    expect(counts.epique).toBeLessThan(counts.rare);
    for (const legend of byRarity.legendaire) console.log(legend.id, legend.fame, baseValueOf(legend), baseValueOf(legend, 'prime'), dropWeight(legend).toFixed(2));
  });

  it('calcule des stats valides', () => {
    for (const athlete of ATHLETES) {
      const stats = statsOf(athlete);
      for (const value of Object.values(stats)) {
        expect(value).toBeGreaterThanOrEqual(20);
        expect(value).toBeLessThanOrEqual(99);
      }
      expect(overallOf(athlete, 'prime')).toBeGreaterThanOrEqual(overallOf(athlete));
      expect(ultiOf(athlete).effects.length).toBeGreaterThan(0);
    }
  });

  it('rend toujours plus forte une carte plus rare', () => {
    const byRarity = athletesByRarity();
    for (let i = 0; i < RARITY_ORDER.length - 1; i++) {
      const lower = byRarity[RARITY_ORDER[i]].map((a) => overallOf(a));
      const higher = byRarity[RARITY_ORDER[i + 1]].map((a) => overallOf(a));
      expect(Math.max(...lower)).toBeLessThan(Math.min(...higher));
    }
    const top = ATHLETES.slice().sort((a, b) => overallOf(b) - overallOf(a)).slice(0, 5).map((a) => `${a.id} ${overallOf(a)}`);
    console.log('meilleures notes', top.join(', '), '| Guépard', overallOf(ATHLETES.find((a) => a.id === 'guepard')!));
  });
});
