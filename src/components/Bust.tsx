import { useId } from 'react';
import type { SportId } from '../engine/types';
import { SportIcon } from './SportIcon';

// Illustration des espèces sans photo libre : un médaillon aux couleurs de la famille,
// frappé de son emblème (patte, aileron, empreinte de dinosaure…).

interface BustProps {
  color: string;
  sport: SportId;
  className?: string;
}

export function Bust({ color, sport, className }: BustProps) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className={className} viewBox="0 0 100 124" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <defs>
        <radialGradient id={`glow-${id}`} cx="0.5" cy="0.42" r="0.6">
          <stop offset="0" stopColor={color} stopOpacity="0.55" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`disc-${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor="#10131a" stopOpacity="0.9" />
        </linearGradient>
      </defs>
      <rect width="100" height="124" fill={`url(#glow-${id})`} />
      <circle cx="50" cy="58" r="34" fill={`url(#disc-${id})`} />
      <circle cx="50" cy="58" r="34" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.6" />
      <svg x="26" y="34" width="48" height="48" viewBox="0 0 24 24" color="#fff" opacity="0.92">
        <SportIcon sport={sport} />
      </svg>
    </svg>
  );
}
