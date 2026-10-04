import { useId } from 'react';
import { area, bird, circle, draw, hills, mix, mountain, mulberry32, pine, spots } from '../art/kit';
import { Logo } from './Logo';

// Dos des cartes, dans le langage des boosters et des bannières du site : une petite affiche de crépuscule.
// Le soleil se couche au fond d'une vallée (halo et deux anneaux pâles, comme la lune du fond de page), entre
// deux sommets, derrière la brume et trois rangées de sapins ; le ciel passe du bleu nuit à la pêche et les
// premières étoiles s'allument. Le logo est dans le ciel, un filet crème fait la marge.
// Repère 100 × 140 (les proportions de la carte). Le dessin ne change jamais : il est tracé une seule fois.

const W = 100;
const SKY = ['#14273f', '#f0a468'];
const SUN = '#fff0cf';
const FAR = '#6b7f6a';
const NEAR = '#0b170f';
const tone = (t: number) => mix(FAR, NEAR, t);

interface Art {
  stars: string[];
  birds: string;
  peaks: { body: string; shadow: string }[];
  ridges: string[];
}

let art: Art | null = null;

function trace(): Art {
  const r = mulberry32(5);
  let birds = '';
  for (let i = 0; i < 5; i++) birds += bird(60 + (r() - 0.5) * 22, 62 + (r() - 0.5) * 9, 1.5 * (0.6 + r() * 0.7), 0.6 + r() * 0.8);
  // trois éclats d'étoiles, du plus vif au plus pâle
  const stars = ['', '', ''];
  for (let i = 0; i < 36; i++) stars[i % 3] += circle(r() * W, r() * 44, 0.2 + r() * 0.42);
  const peaks = [mountain(r, 10, 70, 106, 30, 28), mountain(r, 92, 66, 106, 28, 30)];
  // rangées de sapins : [ligne de base, relief, taille mini et maxi des arbres, écart]
  const ridges = (
    [
      [102, 3, 7, 12, 3.6],
      [111, 3, 12, 19, 5],
      [122, 2, 22, 38, 7],
    ] as const
  ).map(([base, amp, min, max, gap]) => {
    const l = hills(r, base, amp);
    return area(l, W) + draw(spots(r, l, W, min, max, gap), pine);
  });
  return { stars, birds, peaks, ridges };
}

export function CardBack({ className = '' }: { className?: string }) {
  const id = `cb${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  art ??= trace();
  const mist = (y0: number, y1: number, opacity: number) => <rect x={-2} y={y0} width={W + 4} height={y1 - y0} fill={`url(#${id}-mist)`} opacity={opacity} />;
  return (
    <div className={`card-back ${className}`}>
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
        <rect width="100" height="140" fill={`url(#${id}-sky)`} />
        {art.stars.map((d, i) => (
          <path key={i} d={d} fill="#ffffff" opacity={[0.57, 0.36, 0.21][i]} />
        ))}
        <circle cx={50} cy={88} r={51} fill={`url(#${id}-glow)`} />
        <circle cx={50} cy={88} r={24} fill="none" stroke={SUN} strokeOpacity={0.22} strokeWidth={0.45} />
        <circle cx={50} cy={88} r={33.75} fill="none" stroke={SUN} strokeOpacity={0.12} strokeWidth={0.45} />
        <circle cx={50} cy={88} r={15} fill={SUN} />
        <path d="M10 74h34M58 70h30M20 79h22" stroke={SUN} strokeOpacity={0.35} strokeWidth={1.4} strokeLinecap="round" />
        <path d={art.birds} fill={tone(0.85)} />
        {art.peaks.map((m, i) => (
          <g key={i}>
            <path d={m.body} fill={FAR} />
            <path d={m.shadow} fill={NEAR} opacity={0.14} />
          </g>
        ))}
        {mist(84, 104, 0.6)}
        <path d={art.ridges[0]} fill={tone(0.35)} />
        {mist(96, 112, 0.4)}
        <path d={art.ridges[1]} fill={tone(0.66)} />
        <path d={art.ridges[2]} fill={NEAR} />
        <rect x={3.4} y={3.4} width={93.2} height={133.2} rx={3.4} fill="none" stroke="#fff8ec" strokeOpacity={0.55} strokeWidth={0.45} />
      </svg>
      <div className="card-back__grain" />
      <div className="card-back__gloss" />
      <div className="card-back__crest">
        <Logo />
        <small>Série 1</small>
      </div>
    </div>
  );
}
