import { describe, expect, it } from 'vitest';
import { ATHLETES } from '../../data/athletes';
import { MESURES, formatLongevite, formatPoids, formatTaille, mesuresOf } from '../../data/mesures';

describe('mesures des espèces', () => {
  it('chaque espèce a ses mesures, et aucune mesure ne vise une espèce inconnue', () => {
    const species = ATHLETES.filter((a) => !a.mythe).map((a) => a.id);
    expect(species.filter((id) => !MESURES[id])).toEqual([]);
    const known = new Set(species);
    expect(Object.keys(MESURES).filter((id) => !known.has(id))).toEqual([]);
  });

  it('formate les unités à la française', () => {
    expect(formatPoids(150000)).toBe('150 t');
    expect(formatPoids(1500)).toBe('1,5 t');
    expect(formatPoids(190)).toBe('190 kg');
    expect(formatPoids(2.5)).toBe('2,5 kg');
    expect(formatPoids(0.75)).toBe('750 g');
    expect(formatPoids(0.0018)).toBe('1,8 g');
    expect(formatTaille(2.5)).toBe('2,5 m');
    expect(formatTaille(0.45)).toBe('45 cm');
    expect(formatTaille(0.006)).toBe('6 mm');
    expect(formatLongevite(14)).toBe('14 ans');
    expect(formatLongevite(1)).toBe('1 an');
    expect(formatLongevite(0.5)).toBe('6 mois');
    expect(formatLongevite(0.04)).toBe('15 jours');
  });

  it('les cartes Mythe n’ont pas de mesures', () => {
    expect(mesuresOf('mythe-dragon')).toBeNull();
    expect(mesuresOf('lion')).toMatchObject({ poids: '190 kg', taille: '2,5 m', longevite: '14 ans' });
  });
});
