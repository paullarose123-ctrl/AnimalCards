import type { SceneDef } from '../components/PackScene';

// Paysages du site, dans le même langage que les boosters : chaque écran a son affiche.

/** Fond de page : sous-bois de sapins sous un ciel de nuit, en tons sourds pour ne pas gêner la lecture. */
export const SITE_SCENE: SceneDef = {
  kind: 'foret',
  stars: true,
  palette: { sky: ['#0a1411', '#23402f'], sun: '#efe1b8', far: '#2b4a3a', near: '#08110d', accent: '#ffffff' },
};

/** Accueil (boosters gratuits) : sommets à l'aube et un aigle. */
export const HERO_SCENE: SceneDef = {
  kind: 'montagne',
  creature: 'aigle',
  palette: { sky: ['#1a2c4e', '#f4a06a'], sun: '#ffe7bd', far: '#8a8fb0', near: '#101528', accent: '#fdf2e6' },
};

/** Bannières des écrans */
export const SCREEN_SCENES = {
  // collection : prairie au crépuscule, un lapin dans les fleurs
  collection: {
    kind: 'collines',
    creature: 'lapin',
    palette: { sky: ['#203a5c', '#f6b26b'], sun: '#fff0cf', far: '#7d9a6a', near: '#12200f', accent: '#ff8fb1' },
  },
  // marché : savane au couchant et girafes
  mercato: {
    kind: 'savane',
    creature: 'girafes',
    palette: { sky: ['#3d1a3a', '#ff8f4a'], sun: '#ffe2a2', far: '#b4573c', near: '#1b0b0f', accent: '#ffe2a2' },
  },
  // arène : volcan en éruption et ptérosaures
  matchs: {
    kind: 'volcan',
    creature: 'pteros',
    palette: { sky: ['#2a0e1e', '#e2574c'], sun: '#ffd7a0', far: '#8a3a3e', near: '#160709', accent: '#ffb347' },
  },
  // boutique : aurore boréale
  boutique: {
    kind: 'aurore',
    palette: { sky: ['#070f1f', '#2a2266'], sun: '#f0eeff', far: '#3e3f86', near: '#070917', accent: '#5ff2c0', accent2: '#d27bff' },
  },
} satisfies Record<string, SceneDef>;
