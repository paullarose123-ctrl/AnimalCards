import { useId } from 'react';
import { EAGLE, area, bird, circle, draw, hashString, hills, mix, mulberry32, peaks, spots } from '../art/kit';
import { agave, cardon, nopal, pyramid, ridgeSnow, volcano } from '../art/mexique';
import { Logo } from './Logo';

// Dos des cartes de la Série 2 (Mexique), dans le langage du dos de la série 1 : la même affiche de crépuscule,
// au Mexique. Le soleil se couche derrière la pyramide du Soleil de Teotihuacan, entre le Popocatépetl qui fume
// et l'Iztaccíhuatl enneigé ; un aigle royal plane au-dessus de rangées d'agaves, de nopals et de cardons.
// Couleurs du drapeau : ciel vert profond, soleil blanc, terres rouges.
// Repère 100 × 140 (les proportions de la carte). Le dessin ne change jamais : il est tracé une seule fois.

const W = 100;
const SKY = ['#0b3f2c', '#f7e3c2'];
const SUN = '#fff8ea';
const FAR = '#c9473d';
const NEAR = '#170807';
const tone = (t: number) => mix(FAR, NEAR, t);

interface Art {
  stars: string[];
  birds: string;
  izta: string;
  iztaSnow: string;
  smoke: string;
  popo: { body: string; snow: string; shadow: string };
  rows: { ground: string; plants: string }[];
  pyramid: ReturnType<typeof pyramid>;
  front: string;
  cacti: string;
}

let art: Art | null = null;

function trace(): Art {
  const r = mulberry32(hashString('Dos · Série 2 · Mexique'));
  // trois éclats d'étoiles, du plus vif au plus pâle
  const stars = ['', '', ''];
  for (let i = 0; i < 36; i++) stars[i % 3] += circle(r() * W, r() * 44, 0.2 + r() * 0.42);
  let birds = '';
  for (let i = 0; i < 3; i++) birds += bird(30 + (r() - 0.5) * 12, 60 + (r() - 0.5) * 5.4, 1.2 * (0.6 + r() * 0.7), 0.6 + r() * 0.8);
  const iztaccihuatl = peaks(
    r,
    106,
    [
      [74, 26, 14],
      [86, 30, 12],
      [97, 26, 11],
    ],
    1.1,
  );
  let smoke = '';
  for (const [x, y, s] of [
    [17, 63, 2.4],
    [20.5, 59, 3.1],
    [25.5, 56, 3.8],
    [32, 54.5, 4.2],
  ])
    smoke += circle(x, y, s);
  const popo = volcano(r, 15, 67, 107, 26, 25);
  // rangées de plantes, de la plus lointaine à la plus proche ; la pyramide se dresse sur la première
  const l1 = hills(r, 103, 2.4);
  const row1 = { ground: area(l1, W), plants: draw(spots(r, l1, W, 3.5, 5.5, 6), agave) };
  const pyr = pyramid(50, l1(50) + 0.6, 40, 22);
  const l2 = hills(r, 113, 2.4);
  const row2 = { ground: area(l2, W), plants: draw(spots(r, l2, W, 7, 11, 8), (x, y, h) => (r() < 0.5 ? nopal(x, y, h) : agave(x, y, h * 0.75))) };
  const l3 = hills(r, 124, 2);
  return {
    stars,
    birds,
    izta: area(iztaccihuatl, W),
    iztaSnow: ridgeSnow(iztaccihuatl, 62, 102, 86),
    smoke,
    popo,
    rows: [row1, row2, { ground: area(l3, W), plants: '' }],
    pyramid: pyr,
    front: agave(70, l3(70) + 1, 13) + nopal(32, l3(32) + 1, 15) + agave(50, l3(50) + 1, 9),
    cacti: cardon(12, l3(12) + 1, 34) + cardon(88, l3(88) + 1, 26),
  };
}

export function CardBackMexique({ className = '' }: { className?: string }) {
  const id = `cbm${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  art ??= trace();
  const mist = (y0: number, y1: number, opacity: number) => <rect x={-2} y={y0} width={W + 4} height={y1 - y0} fill={`url(#${id}-mist)`} opacity={opacity} />;
  const { pyramid: pyr } = art;
  return (
    <div className={`card-back card-back--mexique ${className}`}>
      <svg className="card-back__scene" viewBox="0 0 100 140" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY[0]} />
            <stop offset="0.72" stopColor={SKY[1]} />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor={SUN} stopOpacity={0.6} />
            <stop offset="0.35" stopColor={SUN} stopOpacity={0.22} />
            <stop offset="1" stopColor={SUN} stopOpacity={0} />
          </radialGradient>
          <linearGradient id={`${id}-mist`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={SKY[1]} stopOpacity={0} />
            <stop offset="1" stopColor={SKY[1]} stopOpacity={0.85} />
          </linearGradient>
        </defs>
        <rect x={-2} y={-2} width={W + 4} height={144} fill={`url(#${id}-sky)`} />
        {art.stars.map((d, i) => (
          <path key={i} d={d} fill="#ffffff" opacity={[0.7, 0.45, 0.25][i]} />
        ))}
        <circle cx={50} cy={88} r={51} fill={`url(#${id}-glow)`} />
        <circle cx={50} cy={88} r={24} fill="none" stroke={SUN} strokeOpacity={0.22} strokeWidth={0.45} />
        <circle cx={50} cy={88} r={33.75} fill="none" stroke={SUN} strokeOpacity={0.12} strokeWidth={0.45} />
        <circle cx={50} cy={88} r={15} fill={SUN} />
        <path d="M10 74h34M58 70h30M20 79h22" stroke={SUN} strokeOpacity={0.35} strokeWidth={1.4} strokeLinecap="round" />
        <path d={EAGLE} fill={tone(0.85)} transform="translate(66 58) rotate(-6) scale(1.15)" />
        <path d={art.birds} fill={tone(0.85)} />
        <path d={art.izta} fill={mix(FAR, SKY[1], 0.12)} />
        <path d={art.iztaSnow} fill="#ffffff" opacity={0.88} />
        <path d={art.smoke} fill={mix(SKY[1], NEAR, 0.18)} opacity={0.55} />
        <path d={art.popo.body} fill={FAR} />
        <path d={art.popo.snow} fill="#ffffff" opacity={0.92} />
        <path d={art.popo.shadow} fill={NEAR} opacity={0.16} />
        {mist(84, 106, 0.6)}
        <path d={art.rows[0].ground} fill={tone(0.34)} />
        <path d={art.rows[0].plants} fill={tone(0.34)} />
        <path d={pyr.body} fill={tone(0.48)} />
        <path d={pyr.shade} fill={NEAR} opacity={0.22} />
        <path d={pyr.stairs} fill={NEAR} opacity={0.16} />
        <path d={pyr.steps} fill="none" stroke={SUN} strokeOpacity={0.2} strokeWidth={0.3} />
        <path d={pyr.rims} fill="none" stroke={SUN} strokeOpacity={0.42} strokeWidth={0.4} />
        {mist(96, 114, 0.4)}
        <path d={art.rows[1].ground} fill={tone(0.68)} />
        <path d={art.rows[1].plants} fill={tone(0.68)} />
        <path d={art.rows[2].ground} fill={NEAR} />
        <path d={art.front} fill={NEAR} />
        <path d={art.cacti} fill="none" stroke={NEAR} strokeWidth={4.1} strokeLinecap="round" strokeLinejoin="round" />
        <rect x={3.4} y={3.4} width={93.2} height={133.2} rx={3.4} fill="none" stroke="#fff8ec" strokeOpacity={0.55} strokeWidth={0.45} />
      </svg>
      <div className="card-back__grain" />
      <div className="card-back__gloss" />
      <div className="card-back__crest">
        <Logo />
        <small>Série 2 · México</small>
      </div>
    </div>
  );
}
