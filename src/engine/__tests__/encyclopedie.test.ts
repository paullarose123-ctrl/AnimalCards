import { describe, expect, it } from 'vitest';
import { ATHLETES } from '../../data/athletes';
import { ENCYCLOPEDIE, REGIMES, RYTHMES, UICN } from '../../data/encyclopedie';

const species = ATHLETES.filter((a) => !a.habitat);

describe('encyclopédie des espèces', () => {
  it('chaque espèce a sa fiche, et aucune fiche ne vise une espèce inconnue ou un Habitat', () => {
    expect(species.filter((a) => !ENCYCLOPEDIE[a.id]).map((a) => a.id)).toEqual([]);
    const known = new Set(species.map((a) => a.id));
    expect(Object.keys(ENCYCLOPEDIE).filter((id) => !known.has(id))).toEqual([]);
  });

  it('toutes les rubriques sont remplies, avec des valeurs connues', () => {
    for (const [id, e] of Object.entries(ENCYCLOPEDIE)) {
      expect(REGIMES[e.regime], id).toBeTruthy();
      expect(RYTHMES[e.rythme], id).toBeTruthy();
      expect(UICN[e.uicn], id).toBeTruthy();
      for (const text of [e.menu, e.social, e.petits, e.savais]) expect(text.trim().length, id).toBeGreaterThan(5);
      if (e.vitesse) expect(e.vitesse.kmh, id).toBeGreaterThan(0);
    }
  });

  it('les Icônes sont éteintes (ou éteintes à l’état sauvage), et elles seules', () => {
    for (const a of species) {
      const gone = ['EX', 'EW'].includes(ENCYCLOPEDIE[a.id].uicn);
      expect(gone, a.id).toBe(!!a.retired);
    }
  });

  it('une espèce menacée ou disparue dit ce qui la menace', () => {
    const threatened = Object.entries(ENCYCLOPEDIE).filter(([, e]) => ['VU', 'EN', 'CR', 'EW', 'EX'].includes(e.uicn));
    expect(threatened.filter(([, e]) => !e.menaces).map(([id]) => id)).toEqual([]);
  });

  it('les textes n’ont ni double ponctuation ni espace avant une virgule', () => {
    for (const [id, e] of Object.entries(ENCYCLOPEDIE)) {
      for (const text of [e.menu, e.social, e.petits, e.savais, e.menaces ?? '', e.note ?? '', e.vitesse?.note ?? '']) {
        expect(text, id).not.toMatch(/\.\.|,,|\s,|\s\.$/);
      }
    }
  });
});
