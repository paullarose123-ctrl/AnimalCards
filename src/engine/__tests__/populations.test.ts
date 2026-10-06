import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { POPULATIONS, formatPopulation, populationOf } from '../../data/populations';

// les races de chien n'ont pas de recensement propre
const living = ATHLETES.filter((a) => !a.habitat && !a.race && !a.retired);

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

  it('les espèces disparues sont « Éteint », les Habitats n’ont pas de population', () => {
    expect(populationOf(ATHLETES_BY_ID['thylacine'])).toMatchObject({ value: 'Éteint', extinct: true });
    expect(populationOf(ATHLETES_BY_ID['lion-de-l-atlas'])?.extinct).toBe(true);
    expect(populationOf(ATHLETES_BY_ID['habitat-amazonie'])).toBeNull();
    expect(plain(populationOf(ATHLETES_BY_ID['lion'])?.value)).toBe('23 000');
    expect(populationOf(ATHLETES_BY_ID['lion'])?.label).toBe('Population sauvage');
    expect(populationOf(ATHLETES_BY_ID['poule'])?.label).toBe('Population mondiale');
  });
});

describe('habitats', () => {
  it('ne citent que des espèces du jeu', () => {
    for (const habitat of ATHLETES.filter((a) => a.habitat)) {
      const missing = habitat.habitat!.especes.filter((id) => !ATHLETES_BY_ID[id] || ATHLETES_BY_ID[id].habitat);
      expect(missing, habitat.id).toEqual([]);
    }
  });
});
