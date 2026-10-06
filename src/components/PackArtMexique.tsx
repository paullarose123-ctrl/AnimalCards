import { useId, type CSSProperties } from 'react';
import { EAGLE, area, bird, circle, draw, ellipse, hashString, hills, mix, mulberry32, peaks, spots } from '../art/kit';
import { agave, cardon, nopal, pyramid, ridgeSnow, volcano } from '../art/mexique';
import { Logo } from './Logo';
import { Plastic } from './PackArt';

// Booster de la Série 2 (Mexique), sur le même sachet que les boosters de la série 1 (PackArt) : la pyramide du
// Soleil de Teotihuacan se découpe sur le soleil couchant, entre le Popocatépetl qui fume et l'Iztaccíhuatl
// enneigé ; un aigle royal plane au-dessus des agaves, des nopals et des cardons.
// Couleurs du drapeau, à l'inverse du dos des cartes : ciel rouge, soleil blanc, terres vertes.
// Repère 120 × 172 (le sachet). Le dessin ne change jamais : il est tracé une seule fois.

const W = 120;
const SKY = ['#c4213a', '#ffe0b5'];
const SUN = '#fff8ea';
const FAR = '#5ba878';
const NEAR = '#05261a';
const tone = (t: number) => mix(FAR, NEAR, t);

const STYLE = { '--near': NEAR, '--ink': '#fff8ec', '--pk-title': '15cqw' } as CSSProperties;

interface Art {
  stars: string[];
  birds: string;
  izta: string;
  iztaSnow: string;
  smoke: string;
  popo: { body: string; snow: string; shadow: string };
  rows: { ground: string; plants: string }[];
  pyramid: ReturnType<typeof pyramid>;
  cacti: string;
  front: string;
}

let art: Art | null = null;

function trace(): Art {
  const r = mulberry32(hashString('Série 2 · Mexique'));
  // trois éclats d'étoiles, du plus vif au plus pâle
  const stars = ['', '', ''];
  for (let i = 0; i < 14; i++) stars[i % 3] += circle(r() * W, r() * 34, 0.2 + r() * 0.42);
  let birds = '';
  for (let i = 0; i < 3; i++) birds += bird(44 + (r() - 0.5) * 10, 66 + (r() - 0.5) * 4.5, 1.15 * (0.6 + r() * 0.7), 0.6 + r() * 0.8);
  const iztaccihuatl = peaks(
    r,
    112,
    [
      [80, 24, 15],
      [93, 28, 13],
      [104, 26, 12],
      [116, 21, 11],
    ],
    1.1,
  );
  let smoke = '';
  for (const [x, y, s] of [
    [22.6, 60.4, 2.4],
    [19.8, 56.4, 3.1],
    [15.4, 53.2, 3.8],
    [10, 51.4, 4.4],
    [4, 51, 4.6],
  ])
    smoke += circle(x, y, s);
  const popo = volcano(r, 24, 65, 114, 29, 27);
  // rangées de plantes, de la plus lointaine à la plus proche ; la pyramide se dresse sur la première
  const l1 = hills(r, 114, 2.5);
  const row1 = { ground: area(l1, W), plants: draw(spots(r, l1, W, 4, 6, 7), agave) };
  const pyr = pyramid(60, l1(60) + 0.6, 56, 31);
  const l2 = hills(r, 123, 2.6);
  const row2 = { ground: area(l2, W), plants: draw(spots(r, l2, W, 7, 11, 9), (x, y, h) => (r() < 0.5 ? nopal(x, y, h) : agave(x, y, h * 0.7))) };
  const l3 = hills(r, 134, 2);
  return {
    stars,
    birds,
    izta: area(iztaccihuatl, W),
    iztaSnow: ridgeSnow(iztaccihuatl, 68, 122, 93),
    smoke,
    popo,
    rows: [row1, row2, { ground: area(l3, W), plants: '' }],
    pyramid: pyr,
    cacti: cardon(12, l3(12) + 1, 46) + cardon(108, l3(108) + 1, 32),
    front: agave(92, l3(92) + 1, 15) + nopal(27, l3(27) + 1, 17),
  };
}

export function PackArtMexique({ className = '' }: { className?: string }) {
  const id = `pam${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  art ??= trace();
  const mist = (y0: number, y1: number, opacity: number) => <rect x={-2} y={y0} width={W + 4} height={y1 - y0} fill={`url(#${id}-mist)`} opacity={opacity} />;
  const { pyramid: pyr } = art;
  return (
    <div className={`pack-art pack-art--mexique ${className}`} style={STYLE}>
      <div className="pack-art__sachet">
        <svg className="pack-art__scene" viewBox="0 0 120 172" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
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
            <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={NEAR} stopOpacity={0} />
              <stop offset="0.55" stopColor={NEAR} stopOpacity={0.55} />
              <stop offset="1" stopColor={NEAR} stopOpacity={0.92} />
            </linearGradient>
          </defs>
          <rect x={-2} y={-2} width={W + 4} height={176} fill={`url(#${id}-sky)`} />
          {art.stars.map((d, i) => (
            <path key={i} d={d} fill="#ffffff" opacity={[0.7, 0.45, 0.25][i]} />
          ))}
          <circle cx={60} cy={92} r={57.8} fill={`url(#${id}-glow)`} />
          <circle cx={60} cy={92} r={27.2} fill="none" stroke={SUN} strokeOpacity={0.22} strokeWidth={0.5} />
          <circle cx={60} cy={92} r={38.25} fill="none" stroke={SUN} strokeOpacity={0.12} strokeWidth={0.5} />
          <circle cx={60} cy={92} r={17} fill={SUN} />
          <path d={ellipse(24, 70, 17, 0.9)} fill={SUN} opacity={0.32} />
          <path d={ellipse(96, 62, 13, 0.9)} fill={SUN} opacity={0.24} />
          <path d={art.birds} fill={tone(0.85)} />
          <path d={EAGLE} fill={tone(0.9)} transform="translate(87 56) rotate(-6) scale(1.4)" />
          <path d={art.izta} fill={mix(FAR, SKY[1], 0.18)} />
          <path d={art.iztaSnow} fill="#ffffff" opacity={0.9} />
          <path d={art.smoke} fill={mix(SKY[1], NEAR, 0.18)} opacity={0.55} />
          <path d={art.popo.body} fill={FAR} />
          <path d={art.popo.snow} fill="#ffffff" opacity={0.92} />
          <path d={art.popo.shadow} fill={NEAR} opacity={0.18} />
          {mist(88, 114, 0.55)}
          <path d={art.rows[0].ground} fill={tone(0.3)} />
          <path d={art.rows[0].plants} fill={tone(0.3)} />
          <path d={pyr.body} fill={tone(0.46)} />
          <path d={pyr.shade} fill={NEAR} opacity={0.22} />
          <path d={pyr.stairs} fill={NEAR} opacity={0.16} />
          <path d={pyr.steps} fill="none" stroke={SUN} strokeOpacity={0.2} strokeWidth={0.3} />
          <path d={pyr.rims} fill="none" stroke={SUN} strokeOpacity={0.42} strokeWidth={0.4} />
          {mist(104, 124, 0.32)}
          <path d={art.rows[1].ground} fill={tone(0.68)} />
          <path d={art.rows[1].plants} fill={tone(0.68)} />
          <path d={art.rows[2].ground} fill={NEAR} />
          <path d={art.cacti} fill="none" stroke={NEAR} strokeWidth={5.5} strokeLinecap="round" strokeLinejoin="round" />
          <path d={art.front} fill={NEAR} />
          {/* ombre au pied de la scène, pour que le nom posé dessus se lise toujours */}
          <rect x={-2} y={112} width={W + 4} height={62} fill={`url(#${id}-shade)`} />
        </svg>
        <div className="pack-art__grain" />
        <div className="pack-art__frame" />
        <div className="pack-art__logo">
          <Logo />
        </div>
        <div className="pack-art__series">Série 2 · México</div>
        <div className="pack-art__kicker">Édition spéciale</div>
        <div className="pack-art__name">Mexique</div>
        <div className="pack-art__line">
          <span>5 cartes</span>
        </div>
        <div className="pack-art__pillow" />
        <Plastic seed="Série 2 · Mexique" />
        <div className="pack-art__seal pack-art__seal--top" />
        <div className="pack-art__seal pack-art__seal--bottom" />
        <div className="pack-art__gloss" />
        <div className="pack-art__shine" />
      </div>
    </div>
  );
}
