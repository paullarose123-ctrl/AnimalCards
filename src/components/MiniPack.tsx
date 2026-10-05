import { useId } from 'react';

// Mini booster (barre du haut) : le sachet du booster gratuit en miniature, avec ses bords sertis en dents de scie,
// son ciel de forêt au lever du jour, ses sapins, son soleil et un reflet d'aluminium.

const W = 20;
const H = 28;

/** Bord serti en dents de scie (haut ou bas du sachet). */
function crimp(y: number, dir: 1 | -1): string {
  let d = '';
  for (let x = 0; x <= W; x += 2) d += `L${x},${y + (x % 4 === 0 ? 0 : dir * 1.2)} `;
  return d;
}

export function MiniPack({ className = '' }: { className?: string }) {
  const id = `mp${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const outline = `M0,1.2 ${crimp(1.2, -1)} L${W},${H - 1.2} ${crimp(H - 1.2, 1).split(' ').reverse().join(' ')} Z`;
  return (
    <svg className={`mini-pack ${className}`} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#6cc6c0" />
          <stop offset="0.65" stopColor="#ffe1a6" />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0.35" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.75" />
          <stop offset="0.65" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={W} height={H} fill={`url(#${id}-sky)`} />
        <circle cx={13} cy={11.5} r={3} fill="#fff5d8" />
        <path d="M0,19 L4,13 L7,17 L11,11 L15,16 L20,12 V28 H0 Z" fill="#8cc2a6" />
        <path d="M0,28 V21 l1.5,-3 1.5,3 1.5,-4 1.5,4 1.5,-2.5 1.5,2.5 1.5,-4.5 1.5,4.5 1.5,-3 1.5,3 1.5,-4 1.5,4 1.5,-2.5 1,2.5 V28 Z" fill="#0d2a26" />
        {/* bandes serties et étiquette du logo */}
        <rect y={0} width={W} height={3.2} fill="#0d2a26" opacity={0.55} />
        <rect y={H - 3.2} width={W} height={3.2} fill="#0d2a26" opacity={0.7} />
        <rect x={4} y={5} width={12} height={2.2} rx={1.1} fill="#0d2a26" opacity={0.75} />
        <rect className="mini-pack__shine" x={-W} width={W * 3} height={H} fill={`url(#${id}-shine)`} />
      </g>
      <path d={outline} fill="none" stroke="#fff" strokeOpacity={0.55} strokeWidth={0.6} />
    </svg>
  );
}
