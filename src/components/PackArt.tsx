import type { CSSProperties } from 'react';
import type { PackDef } from '../engine/packs';
import type { SportId } from '../engine/types';
import { Logo } from './Logo';
import { PackScene, isLight, type SceneDef } from './PackScene';

// Booster en affiche illustrée : un paysage peint propre à chaque pack (PackScene), un filet de cadre,
// le logo dans le ciel et le nom en serif italique sur le premier plan sombre.
// 1 cqw = 1 % de la largeur du sachet.

type Tone = PackDef['tone'];

const PACK_SCENES: Record<Exclude<Tone, 'sport'>, SceneDef> = {
  // gratuit : forêt de sapins au lever du jour
  bronze: { kind: 'foret', palette: { sky: ['#6cc6c0', '#ffe1a6'], sun: '#fff5d8', far: '#8cc2a6', near: '#0d2a26', accent: '#ffffff' } },
  // découverte : sommets enneigés, matin bleu
  silver: { kind: 'montagne', palette: { sky: ['#4f9fe0', '#d5ecff'], sun: '#ffffff', far: '#9ebde6', near: '#132748', accent: '#f4f8ff' } },
  // pro : savane au coucher du soleil
  gold: { kind: 'savane', creature: 'girafes', palette: { sky: ['#e5484d', '#ffc857'], sun: '#fff1c4', far: '#ef9a4b', near: '#2a1012', accent: '#ffe9a8' } },
  // élite : aurore boréale
  violet: {
    kind: 'aurore',
    palette: { sky: ['#0a0a24', '#35206a'], sun: '#f3efff', far: '#4b3c8e', near: '#0a0717', accent: '#4ff0b0', accent2: '#c86bff' },
  },
  // icônes (espèces disparues) : volcan et ptérosaures
  icon: { kind: 'volcan', creature: 'pteros', palette: { sky: ['#ea7a52', '#fbd49b'], sun: '#fff2d2', far: '#c97a5c', near: '#26110d', accent: '#ff6b2c' } },
  // prime : océan pastel et dauphins
  prime: { kind: 'ocean', creature: 'dauphins', palette: { sky: ['#f2a7cf', '#ffe4c2'], sun: '#fff9ee', far: '#b0b9f0', near: '#2b2c72', accent: '#ffffff' } },
  // légende : nuit d'or et constellations
  black: { kind: 'nuit', palette: { sky: ['#05060b', '#2b2214'], sun: '#ffd46e', far: '#3b301d', near: '#050404', accent: '#ffd46e' } },
};

const FAMILY_SCENES: Record<SportId, SceneDef> = {
  felins: { kind: 'savane', palette: { sky: ['#4a2a80', '#ff9150'], sun: '#ffd66b', far: '#c2607a', near: '#1a0c1f', accent: '#ffd66b' } },
  canides: { kind: 'nuit', creature: 'loup', palette: { sky: ['#0d1a3a', '#4c74ab'], sun: '#f1f6ff', far: '#3b5888', near: '#080f1f', accent: '#cfe0ff' } },
  ours: { kind: 'foret', palette: { sky: ['#ee8c4c', '#fde3ae'], sun: '#fff3d0', far: '#d98b5f', near: '#2a170f', accent: '#ffffff' } },
  primates: { kind: 'jungle', palette: { sky: ['#ff8aa1', '#ffd8a8'], sun: '#fff3dc', far: '#62b08b', near: '#07281b', accent: '#ffffff' } },
  geants: { kind: 'savane', creature: 'elephant', palette: { sky: ['#b9507a', '#ffc48c'], sun: '#fff0da', far: '#a76c80', near: '#22121d', accent: '#f6e3cf' } },
  ongules: { kind: 'savane', creature: 'girafes', palette: { sky: ['#ffad42', '#ffe8ae'], sun: '#fffbe8', far: '#d9a15c', near: '#3a2211', accent: '#ffffff' } },
  petits: { kind: 'collines', creature: 'lapin', palette: { sky: ['#8fd3f2', '#fff0c8'], sun: '#fffbea', far: '#a9d48c', near: '#1d3d1f', accent: '#ff8fb1' } },
  marsupiaux: { kind: 'outback', creature: 'kangourou', palette: { sky: ['#ff7a50', '#ffd28c'], sun: '#fff2d0', far: '#d8643a', near: '#34120a', accent: '#ffd28c' } },
  marins: { kind: 'ocean', creature: 'baleine', palette: { sky: ['#62bdf0', '#e2f5ff'], sun: '#ffffff', far: '#4f99d8', near: '#0a2350', accent: '#ffffff' } },
  requins: { kind: 'recif', creature: 'manta', palette: { sky: ['#3fd0bd', '#0a3858'], sun: '#e8fff9', far: '#1f8c96', near: '#04192a', accent: '#bff7ee' } },
  poissons: { kind: 'recif', creature: 'banc', palette: { sky: ['#5ad2f6', '#0c3a76'], sun: '#ffffff', far: '#3389c4', near: '#06183a', accent: '#ffd166' } },
  rapaces: { kind: 'montagne', creature: 'aigle', palette: { sky: ['#f2737d', '#fbd486'], sun: '#fff4d4', far: '#c9788c', near: '#271322', accent: '#ffe8e0' } },
  oiseaux: { kind: 'marais', creature: 'flamants', palette: { sky: ['#ff7fb0', '#ffd5a6'], sun: '#fff3e4', far: '#e08aab', near: '#2a0f2e', accent: '#ffffff' } },
  reptiles: { kind: 'desert', palette: { sky: ['#36b3ab', '#ffe0a0'], sun: '#fff8de', far: '#e0895a', near: '#36170d', accent: '#ffffff' } },
  amphibiens: { kind: 'marais', creature: 'lucioles', palette: { sky: ['#0e3a3c', '#79c3a2'], sun: '#f2ffd8', far: '#2c7565', near: '#051c19', accent: '#e6ff7a' } },
  insectes: { kind: 'collines', creature: 'papillons', palette: { sky: ['#ff9e45', '#ffe9a6'], sun: '#fffbe6', far: '#b3c75a', near: '#1b2f10', accent: '#4fc3f7' } },
  invertebres: { kind: 'recif', creature: 'meduses', palette: { sky: ['#ff9cc2', '#33246f'], sun: '#fff0f6', far: '#b9579a', near: '#120a2b', accent: '#ffd1ec' } },
  ferme: { kind: 'collines', creature: 'ferme', palette: { sky: ['#7fc2ff', '#fff0c6'], sun: '#fffbe8', far: '#9fd06f', near: '#1f3d1d', accent: '#ffffff' } },
  prehistoire: { kind: 'volcan', creature: 'pteros', palette: { sky: ['#57bf9c', '#f8e2a0'], sun: '#fff6d6', far: '#4c9775', near: '#0e2419', accent: '#ff7a2b' } },
};

/** Tous les paysages des boosters (packs de la boutique et packs par famille). */
export const ALL_PACK_SCENES: SceneDef[] = [...Object.values(PACK_SCENES), ...Object.values(FAMILY_SCENES)];

/** Le paysage d'un pack (les packs par famille ont chacun le leur). */
export function packScene(tone: Tone, sport?: SportId): SceneDef {
  if (tone === 'sport') return FAMILY_SCENES[sport ?? 'felins'];
  return PACK_SCENES[tone];
}

interface PackArtProps {
  tone: Tone;
  name: string;
  sport?: SportId;
  /** nombre de cartes */
  size?: number;
  /** mention de la pastille, ex. « 1 Épique garantie » ; sinon le nombre de cartes */
  guarantee?: string;
  className?: string;
}

export function PackArt({ tone, name, sport, size = 5, guarantee, className = '' }: PackArtProps) {
  const scene = packScene(tone, sport);
  const kicker = name.startsWith('Booster') ? 'Booster' : 'Pack';
  const short = name.replace(/^Pack /, '').replace(/^Booster /, '');
  const title = short.charAt(0).toUpperCase() + short.slice(1);
  const style = {
    '--near': scene.palette.near,
    '--ink': isLight(scene.palette.sky[0]) ? scene.palette.near : '#fff8ec',
    '--pk-title': `${Math.min(15, 128 / Math.max(title.length, 7))}cqw`,
  } as CSSProperties;

  return (
    <div className={`pack-art pack-art--${tone} ${className}`} style={style}>
      <div className="pack-art__sachet">
        <PackScene scene={scene} seed={name} />
        <div className="pack-art__grain" />
        <div className="pack-art__frame" />
        <div className="pack-art__logo">
          <Logo />
        </div>
        <div className="pack-art__series">Série 1</div>
        <div className="pack-art__kicker">{kicker}</div>
        <div className="pack-art__name">{title}</div>
        <div className="pack-art__line">
          <span>{guarantee ?? `${size} cartes`}</span>
        </div>
        <div className="pack-art__seal pack-art__seal--top" />
        <div className="pack-art__seal pack-art__seal--bottom" />
        <div className="pack-art__shine" />
      </div>
    </div>
  );
}
