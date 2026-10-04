import { describe, expect, it } from 'vitest';
import { ATHLETES } from '../../data/athletes';
import { ATHLETES_BY_ID } from '../../data/athletes';
import { athletesByRarity, baseValueOf, collectionNumber, dropWeight, RARITY_ORDER } from '../cards';

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

  it('donne à chaque carte un numéro de collection unique', () => {
    const numbers = ATHLETES.map(collectionNumber);
    expect(numbers.every(Boolean)).toBe(true);
    expect(new Set(numbers).size).toBe(numbers.length);
    expect(collectionNumber(ATHLETES_BY_ID.lion)).toBe('001');
    expect(collectionNumber(ATHLETES_BY_ID['habitat-amazonie'])).toBe('H01');
  });

  it('rend une carte plus rare plus chère, et les Prime et Reverse plus chères que la classique', () => {
    const byRarity = athletesByRarity();
    for (let i = 0; i < RARITY_ORDER.length - 1; i++) {
      const lower = Math.min(...byRarity[RARITY_ORDER[i + 1]].map((a) => baseValueOf(a)));
      const higher = Math.max(...byRarity[RARITY_ORDER[i]].map((a) => baseValueOf(a)));
      expect(lower).toBeGreaterThan(higher * 0.9);
    }
    const lion = ATHLETES_BY_ID.lion;
    expect(baseValueOf(lion, 'prime')).toBeGreaterThan(baseValueOf(lion, 'reverse'));
    expect(baseValueOf(lion, 'reverse')).toBeGreaterThan(baseValueOf(lion));
  });
});
