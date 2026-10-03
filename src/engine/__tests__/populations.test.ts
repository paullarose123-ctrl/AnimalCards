import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { POPULATIONS, formatPopulation, populationOf } from '../../data/populations';

const living = ATHLETES.filter((a) => !a.mythe && !a.retired && a.sport !== 'prehistoire');

describe('populations restantes', () => {
  it('chaque espèce vivante a une estimation, et seulement elles', () => {
    expect(living.filter((a) => POPULATIONS[a.id] == null).map((a) => a.id)).toEqual([]);
    const ids = new Set(living.map((a) => a.id));
    expect(Object.keys(POPULATIONS).filter((id) => !ids.has(id))).toEqual([]);
  });

  // les espaces insécables de toLocaleString deviennent des espaces simples pour comparer
  const plain = (s?: string) => s?.replace(/\s/g, ' ');

  it('formate les grands nombres à la française', () => {
    expect(plain(formatPopulation(670))).toBe('670');
    expect(plain(formatPopulation(23_000))).toBe('23 000');
    expect(plain(formatPopulation(1_500_000))).toBe('1,5 M');
    expect(plain(formatPopulation(26_000_000_000))).toBe('26 Md');
    expect(plain(formatPopulation(2e16))).toBe('2·10¹⁶');
  });

  it('les espèces disparues sont « Éteint », les Mythes n’ont pas de population', () => {
    expect(populationOf(ATHLETES_BY_ID['dodo'])).toMatchObject({ value: 'Éteint', extinct: true });
    expect(populationOf(ATHLETES_BY_ID['t-rex'])?.extinct).toBe(true);
    expect(populationOf(ATHLETES_BY_ID['mythe-dragon'])).toBeNull();
    expect(plain(populationOf(ATHLETES_BY_ID['lion'])?.value)).toBe('23 000');
    expect(populationOf(ATHLETES_BY_ID['lion'])?.label).toBe('Population sauvage');
    expect(populationOf(ATHLETES_BY_ID['poule'])?.label).toBe('Population mondiale');
  });
});
