import type { ReactNode } from 'react';
import type { SportId } from '../engine/types';

// Emblèmes des familles d'animaux en SVG (24×24), trait = currentColor.

const DOT = { fill: 'currentColor', stroke: 'none' } as const;

const ICONS: Record<SportId, ReactNode> = {
  // tête de chat, oreilles pointues et moustaches
  felins: (
    <>
      <path d="M5,9 L5.6,3.4 L9.6,6.9 Q12,6.2 14.4,6.9 L18.4,3.4 L19,9 Q20.6,13 18.6,16.8 Q15.8,20.6 12,20.6 Q8.2,20.6 5.4,16.8 Q3.4,13 5,9 Z" />
      <ellipse cx={9} cy={12} rx={1} ry={1.4} {...DOT} />
      <ellipse cx={15} cy={12} rx={1} ry={1.4} {...DOT} />
      <path d="M10.8,15 H13.2 L12,16.4 Z" {...DOT} />
      <path d="M2.6,14.6 L7.6,15.2 M3,17.6 L7.6,16.4 M21.4,14.6 L16.4,15.2 M21,17.6 L16.4,16.4" strokeWidth={1.2} />
    </>
  ),
  // empreinte de patte
  canides: (
    <>
      <ellipse cx={12} cy={15.6} rx={4.6} ry={3.9} {...DOT} />
      <ellipse cx={5.6} cy={10.2} rx={1.8} ry={2.4} transform="rotate(-22 5.6 10.2)" {...DOT} />
      <ellipse cx={9.4} cy={6} rx={1.9} ry={2.5} transform="rotate(-8 9.4 6)" {...DOT} />
      <ellipse cx={14.6} cy={6} rx={1.9} ry={2.5} transform="rotate(8 14.6 6)" {...DOT} />
      <ellipse cx={18.4} cy={10.2} rx={1.8} ry={2.4} transform="rotate(22 18.4 10.2)" {...DOT} />
    </>
  ),
  // tête d'ours : oreilles rondes, museau
  ours: (
    <>
      <circle cx={12} cy={13.4} r={7.6} />
      <path d="M5.4,9 A2.9,2.9 0 1 1 9.2,5.8 M14.8,5.8 A2.9,2.9 0 1 1 18.6,9" />
      <ellipse cx={12} cy={16.4} rx={3.1} ry={2.3} />
      <ellipse cx={12} cy={15.5} rx={1.2} ry={0.8} {...DOT} />
      <circle cx={9.1} cy={11.6} r={0.95} {...DOT} />
      <circle cx={14.9} cy={11.6} r={0.95} {...DOT} />
    </>
  ),
  // tête de singe : grandes oreilles, visage en cœur
  primates: (
    <>
      <circle cx={12} cy={12} r={7.2} />
      <path d="M4.9,9.9 A2.7,2.7 0 1 0 5.1,15.3 M19.1,9.9 A2.7,2.7 0 1 1 18.9,15.3" />
      <path d="M12,9.8 Q9.8,7.8 8.3,9.6 Q7,11.6 8.7,13.4 Q8,17.6 12,18 Q16,17.6 15.3,13.4 Q17,11.6 15.7,9.6 Q14.2,7.8 12,9.8 Z" strokeWidth={1.3} />
      <circle cx={10.3} cy={11.6} r={0.85} {...DOT} />
      <circle cx={13.7} cy={11.6} r={0.85} {...DOT} />
      <path d="M10.6,15.6 Q12,16.6 13.4,15.6" strokeWidth={1.2} />
    </>
  ),
  // éléphant de profil, trompe tombante
  geants: (
    <path
      d="M3.4,10.4 Q3.4,6 8,6 H12.8 Q15,4.4 17.6,5.4 Q20.6,6.8 20.6,10.6 V17.8 Q20.6,19.2 19.3,19.2 Q18.4,19.2 18.4,18.2 V13.8 Q17.8,13 17,13.6 V19.4 H14.8 V15.8 H8.8 V19.4 H6.6 V15.8 Q4.4,15.4 3.8,13.6 Q3.4,12.2 3.4,10.4 Z M16.6,8.4 A0.85,0.85 0 1 0 16.61,8.4 Z"
      fill="currentColor"
      stroke="none"
      fillRule="evenodd"
    />
  ),
  // tête de cerf et ses bois
  ongules: (
    <>
      <path d="M9.4,11 Q12,10 14.6,11 L13.6,18.6 Q12,20.2 10.4,18.6 Z" />
      <path d="M9.4,11 Q6.8,8.8 6,4 M6.8,7.4 L3.4,5.8 M7.6,9.2 L4.4,9.8 M14.6,11 Q17.2,8.8 18,4 M17.2,7.4 L20.6,5.8 M16.4,9.2 L19.6,9.8" />
      <path d="M9.6,12.4 L6.6,13 M14.4,12.4 L17.4,13" />
      <circle cx={10.8} cy={13.4} r={0.75} {...DOT} />
      <circle cx={13.2} cy={13.4} r={0.75} {...DOT} />
    </>
  ),
  // souris de profil
  petits: (
    <>
      <path d="M4.4,17 Q4.4,10.6 10.6,10.6 Q15.4,10.6 18.4,14 L20.8,15.8 Q20,17 17.6,17 Z" />
      <circle cx={10.6} cy={8.8} r={2.7} />
      <circle cx={16.2} cy={13.6} r={0.8} {...DOT} />
      <path d="M4.4,17 Q1.6,17.4 2.4,19.8 Q3.8,21.8 7.2,20.4" />
    </>
  ),
  // kangourou
  marsupiaux: (
    <path
      d="M14.4,2.8 L15.6,5.5 Q17.7,5.3 18.7,7 Q19.4,8.5 17.9,8.8 L16.3,9 Q15.5,11 16.2,12.4 L17.9,13.6 L17.4,14.5 L15.6,13.7 Q15.4,16 13.9,17.4 L16.8,20.2 H12.6 L11.3,18.7 Q8.9,18.8 7.5,17.6 Q5.1,19.6 1.6,20.4 Q4.5,18.3 6.3,15.6 Q6.7,10.4 10.6,8.6 Q12.6,7.6 13.6,6.1 Z"
      fill="currentColor"
      stroke="none"
    />
  ),
  // queue de baleine au-dessus des vagues
  marins: (
    <>
      <path d="M12,13.2 Q9.6,9.6 6.2,8.9 Q3.6,8.3 2.5,5.2 Q6.5,5.4 9,7 Q11,8.4 12,10.1 Q13,8.4 15,7 Q17.5,5.4 21.5,5.2 Q20.4,8.3 17.8,8.9 Q14.4,9.6 12,13.2 Z" {...DOT} />
      <path d="M12,13 V17.6" strokeWidth={2.2} />
      <path d="M2.5,18.8 Q4.9,17.2 7.2,18.8 T12,18.8 T16.8,18.8 T21.5,18.8 M5,21.6 Q7.4,20.2 9.6,21.6 T14.4,21.6 T19.2,21.6" strokeWidth={1.4} />
    </>
  ),
  // aileron de requin
  requins: (
    <>
      <path d="M6,16.6 Q9.6,12.6 11.4,4.4 Q16.6,8.8 18.8,16.6 Z" {...DOT} />
      <path d="M2,17.2 Q4.5,15.6 7,17.2 T12,17.2 T17,17.2 T22,17.2 M2,20.6 Q4.5,19 7,20.6 T12,20.6 T17,20.6 T22,20.6" strokeWidth={1.4} />
    </>
  ),
  // poisson
  poissons: (
    <>
      <path d="M2.8,12 Q8,5.2 14,7.6 Q17,9 18.6,12 Q17,15 14,16.4 Q8,18.8 2.8,12 Z" />
      <path d="M18.6,12 L22,7.8 V16.2 Z" />
      <path d="M11.2,8.4 Q12.8,12 11.2,15.6" strokeWidth={1.3} />
      <circle cx={7.4} cy={10.9} r={0.95} {...DOT} />
    </>
  ),
  // tête d'aigle, bec crochu
  rapaces: (
    <>
      <path d="M4,20.5 Q4.6,10.4 10.8,7.2 Q15,5 18.6,7 Q21.2,8.5 21.2,11.2 Q21.2,13.4 19.6,13.8 Q19,12 17,12.2 L15,12.6 Q12,16 12.2,20.5" />
      <circle cx={15.6} cy={9.5} r={1} {...DOT} />
      <path d="M12.6,8.4 L17.6,8" strokeWidth={1.3} />
    </>
  ),
  // oiseau sur une branche
  oiseaux: (
    <>
      <path d="M4.4,14 Q6.4,8.6 12,8.8 Q14,6.2 16.8,6.5 Q18.8,7 19.4,8.6 L21.8,9.3 L19.4,10.3 Q19,13.6 15.4,15.6 Q11,18 6.2,16.6 L2.4,18.6 Z" />
      <circle cx={16.9} cy={8.6} r={0.85} {...DOT} />
      <path d="M8.6,12.6 Q12,10.6 15,12.2" strokeWidth={1.3} />
      <path d="M10,17.4 V20.6 M13.4,17 V20.6 M7,20.6 H18" strokeWidth={1.4} />
    </>
  ),
  // serpent
  reptiles: (
    <>
      <path d="M17.4,5.6 Q12,3.4 9,6.2 Q6.4,9 10.4,11 L13.6,12.6 Q17.6,14.6 15.2,18 Q12.2,21.2 5.6,19.4" strokeWidth={2.6} />
      <ellipse cx={18.4} cy={5.8} rx={2.2} ry={1.6} transform="rotate(14 18.4 5.8)" {...DOT} />
      <path d="M20.4,6.6 L22.4,6.2 M20.4,6.6 L22,7.8" strokeWidth={1.1} />
    </>
  ),
  // tête de grenouille
  amphibiens: (
    <>
      <path d="M3,15 Q3,10 7.4,10 Q12,9 16.6,10 Q21,10 21,15 Q21,20.2 12,20.2 Q3,20.2 3,15 Z" />
      <circle cx={7.4} cy={7.6} r={2.7} />
      <circle cx={16.6} cy={7.6} r={2.7} />
      <circle cx={7.4} cy={7.6} r={1.05} {...DOT} />
      <circle cx={16.6} cy={7.6} r={1.05} {...DOT} />
      <path d="M7,15.4 Q12,18.2 17,15.4" />
    </>
  ),
  // scarabée vu de dessus
  insectes: (
    <>
      <ellipse cx={12} cy={14.2} rx={5} ry={6.4} />
      <circle cx={12} cy={6} r={2.3} />
      <path d="M12,7.8 V20.6" strokeWidth={1.3} />
      <path d="M7.2,11 L4,9 M7,14.4 L3.4,14.4 M7.4,18 L4.2,20.4 M16.8,11 L20,9 M17,14.4 L20.6,14.4 M16.6,18 L19.8,20.4 M11,4.2 L9.4,2 M13,4.2 L14.6,2" strokeWidth={1.4} />
    </>
  ),
  // pieuvre
  invertebres: (
    <>
      <path d="M6,12 Q6,3.8 12,3.8 Q18,3.8 18,12" />
      <path d="M6,12 Q5,16 2.4,17.6 M8.6,12.6 Q8.6,18 6,20.6 M12,13 V20.8 M15.4,12.6 Q15.4,18 18,20.6 M18,12 Q19,16 21.6,17.6" />
      <circle cx={9.8} cy={9} r={0.95} {...DOT} />
      <circle cx={14.2} cy={9} r={0.95} {...DOT} />
    </>
  ),
  // grange
  ferme: (
    <>
      <path d="M3,10.2 L12,3.6 L21,10.2 V20.6 H3 Z" />
      <path d="M8.4,20.6 V13.6 H15.6 V20.6 M8.4,13.6 L15.6,20.6 M15.6,13.6 L8.4,20.6" strokeWidth={1.4} />
      <path d="M10.4,9.4 H13.6" strokeWidth={1.4} />
    </>
  ),
  // empreinte de dinosaure à trois doigts
  prehistoire: (
    <path
      d="M12,21 Q8.4,21 8.6,17.2 L4.9,7.6 Q4.7,6.1 6,6.5 L10.4,13.2 L11,3.7 Q12,2.3 13,3.7 L13.6,13.2 L18,6.5 Q19.3,6.1 19.1,7.6 L15.4,17.2 Q15.6,21 12,21 Z"
      fill="currentColor"
      stroke="none"
    />
  ),
};

interface SportIconProps {
  sport: SportId;
  className?: string;
  title?: string;
}

export function SportIcon({ sport, className, title }: SportIconProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {title && <title>{title}</title>}
      {ICONS[sport]}
    </svg>
  );
}
