import { useEffect, useRef, useState } from 'react';

// La monnaie du jeu : les « crédits » (le composant garde son nom d'AthletiCards).
// Une pièce couleur miel frappée d'une empreinte de patte.
export function BallIcon({ className = '' }: { className?: string }) {
  return (
    <svg className={`ball-icon ${className}`} viewBox="0 0 20 20" aria-hidden="true">
      <circle cx={10} cy={10} r={9} fill="#d9a441" />
      <circle cx={10} cy={10} r={9} fill="url(#ball-shade)" />
      <circle cx={10} cy={10} r={7.4} fill="none" stroke="#fff3d1" strokeOpacity={0.45} strokeWidth={0.7} />
      {/* empreinte de patte frappée sur la pièce */}
      <g fill="#fff6dc">
        <ellipse cx={10} cy={12.2} rx={3.1} ry={2.6} />
        <ellipse cx={6.3} cy={8.6} rx={1.25} ry={1.6} transform="rotate(-20 6.3 8.6)" />
        <ellipse cx={8.6} cy={6.6} rx={1.25} ry={1.65} transform="rotate(-6 8.6 6.6)" />
        <ellipse cx={11.4} cy={6.6} rx={1.25} ry={1.65} transform="rotate(6 11.4 6.6)" />
        <ellipse cx={13.7} cy={8.6} rx={1.25} ry={1.6} transform="rotate(20 13.7 8.6)" />
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

/** au-delà, le solde est celui des crédits illimités (voir UNLIMITED_BALLES dans store/game.ts) */
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
      <span className="visually-hidden">{infinite ? ' crédits illimités' : ' crédits'}</span>
    </span>
  );
}
