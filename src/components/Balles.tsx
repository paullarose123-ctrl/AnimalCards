import { useEffect, useRef, useState } from 'react';

// La monnaie du jeu : les « graines » (le composant garde son nom d'AthletiCards).
// Une pièce couleur miel frappée d'une jeune pousse.
export function BallIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`ball-icon ${className}`} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx={10} cy={10} r={9} fill="#d9a441" />
      <circle cx={10} cy={10} r={9} fill="url(#ball-shade)" />
      <circle cx={10} cy={10} r={7.4} fill="none" stroke="#fff3d1" strokeOpacity={0.45} strokeWidth={0.7} />
      <g fill="#fff6dc">
        <path d="M10 15.2 V9.6" stroke="#fff6dc" strokeWidth={1.3} strokeLinecap="round" fill="none" />
        <path d="M10 10.2 C 9.6 7.4, 7.6 6.2, 5.2 6.6 C 5.4 9, 7.4 10.4, 10 10.2 Z" />
        <path d="M10 9.4 C 10.4 6.6, 12.4 5.2, 14.9 5.6 C 14.7 8, 12.7 9.6, 10 9.4 Z" />
      </g>
      <defs>
        <radialGradient id="ball-shade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#fff" stopOpacity="0.45" />
          <stop offset="1" stopColor="#5e3b07" stopOpacity="0.4" />
        </radialGradient>
      </defs>
    </svg>
  );
}

/** au-delà, le solde est celui des graines illimitées (voir UNLIMITED_BALLES dans store/game.ts) */
const INFINITE = 99_999_999_999;

export function Balles({ value, className = '' }: { value: number; className?: string }) {
  const infinite = value >= INFINITE;
  // le solde saute vers le haut quand on gagne des graines, s'enfonce quand on en dépense
  const previous = useRef(value);
  const [move, setMove] = useState<{ dir: 'up' | 'down'; key: number } | null>(null);
  useEffect(() => {
    if (value === previous.current) return;
    setMove((m) => ({ dir: value > previous.current ? 'up' : 'down', key: (m?.key ?? 0) + 1 }));
    previous.current = value;
    const id = window.setTimeout(() => setMove(null), 700);
    return () => window.clearTimeout(id);
  }, [value]);
  return (
    <span className={`balles ${className}${move ? ` is-${move.dir}` : ''}`} key={move?.key}>
      <BallIcon />
      <span className="balles__value">{infinite ? '∞' : value.toLocaleString('fr-FR')}</span>
      <span className="visually-hidden">{infinite ? ' graines illimitées' : ' graines'}</span>
    </span>
  );
}
