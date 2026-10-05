import type { ReactNode } from 'react';

// Drapeaux dessinés en SVG (viewBox 30×20) : les emoji drapeaux ne s'affichent pas sous Windows.

export const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', US: 'États-Unis', ES: 'Espagne', BR: 'Brésil', IT: 'Italie', DE: 'Allemagne',
  'GB-ENG': 'Angleterre', 'GB-SCT': 'Écosse', GB: 'Royaume-Uni', AR: 'Argentine', PT: 'Portugal',
  NL: 'Pays-Bas', BE: 'Belgique', JP: 'Japon', CA: 'Canada', AU: 'Australie', NO: 'Norvège',
  NZ: 'Nouvelle-Zélande', JM: 'Jamaïque', DK: 'Danemark', CM: 'Cameroun', ZA: 'Afrique du Sud',
  UA: 'Ukraine', SI: 'Slovénie', SE: 'Suède', RU: 'Russie', KE: 'Kenya', HR: 'Croatie', CN: 'Chine',
  CI: 'Côte d’Ivoire', CH: 'Suisse', TN: 'Tunisie', SN: 'Sénégal', RS: 'Serbie', PL: 'Pologne',
  NG: 'Nigeria', MA: 'Maroc', GR: 'Grèce', ET: 'Éthiopie', DZ: 'Algérie', RO: 'Roumanie', MX: 'Mexique',
  KR: 'Corée du Sud', HU: 'Hongrie', EG: 'Égypte', CO: 'Colombie', UY: 'Uruguay', QA: 'Qatar',
  PK: 'Pakistan', PH: 'Philippines', MC: 'Monaco', LT: 'Lituanie', LC: 'Sainte-Lucie', KZ: 'Kazakhstan',
  IN: 'Inde', IE: 'Irlande', GN: 'Guinée', GH: 'Ghana', GE: 'Géorgie', FI: 'Finlande', ER: 'Érythrée',
  CZ: 'Tchéquie', BW: 'Botswana', BF: 'Burkina Faso', AT: 'Autriche',
  'GB-WLS': 'Pays de Galles', 'GB-NIR': 'Irlande du Nord', XK: 'Kosovo', HK: 'Hong Kong', TW: 'Taïwan',
  // AnimalCards : pays emblématiques des espèces, et deux « drapeaux » pour les espèces de partout
  XO: 'Océans', XW: 'Plusieurs continents', MG: 'Madagascar', ID: 'Indonésie', MY: 'Malaisie', PE: 'Pérou', TZ: 'Tanzanie',
  NP: 'Népal', PG: 'Papouasie-Nouvelle-Guinée', IS: 'Islande', AQ: 'Antarctique', NA: 'Namibie', RW: 'Rwanda',
  LK: 'Sri Lanka', MU: 'Maurice', SC: 'Seychelles', GL: 'Groenland', GT: 'Guatemala', CU: 'Cuba', CR: 'Costa Rica',
  TR: 'Turquie', SY: 'Syrie', SD: 'Soudan', LR: 'Liberia', FJ: 'Fidji', IL: 'Israël', CL: 'Chili', EC: 'Équateur',
  GA: 'Gabon', CD: 'RD Congo', TH: 'Thaïlande', MN: 'Mongolie',
  CG: 'Congo', BD: 'Bangladesh', BO: 'Bolivie', SO: 'Somalie', KM: 'Comores',
};

let regionNames: Intl.DisplayNames | null | undefined;

/** Nom du pays en français : la liste ci-dessus, sinon celui que connaît le navigateur. */
export function countryName(code: string): string {
  if (COUNTRY_NAMES[code]) return COUNTRY_NAMES[code];
  try {
    regionNames ??= new Intl.DisplayNames(['fr'], { type: 'region' });
    return regionNames.of(code) ?? code;
  } catch {
    regionNames = null;
    return code;
  }
}

function starPoints(cx: number, cy: number, r: number, rotation = -90): string {
  const points: string[] = [];
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.4;
    const angle = ((rotation + i * 36) * Math.PI) / 180;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

/** Soleil ou étoile à n branches (Taïwan, Azerbaïdjan). */
function sunPoints(cx: number, cy: number, r: number, rays: number, inner = 0.55): string {
  const points: string[] = [];
  for (let i = 0; i < rays * 2; i++) {
    const radius = i % 2 === 0 ? r : r * inner;
    const angle = ((-90 + (i * 180) / rays) * Math.PI) / 180;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(2)},${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

const Star = ({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) => (
  <polygon points={starPoints(cx, cy, r)} fill={fill} />
);

function hStripes(colors: string[], weights?: number[]): ReactNode {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((sum, x) => sum + x, 0);
  let y = 0;
  return colors.map((color, i) => {
    const h = (20 * w[i]) / total;
    const rect = <rect key={i} x={0} y={y} width={30} height={h + 0.05} fill={color} />;
    y += h;
    return rect;
  });
}

function vStripes(colors: string[], weights?: number[]): ReactNode {
  const w = weights ?? colors.map(() => 1);
  const total = w.reduce((sum, x) => sum + x, 0);
  let x = 0;
  return colors.map((color, i) => {
    const width = (30 * w[i]) / total;
    const rect = <rect key={i} x={x} y={0} width={width + 0.05} height={20} fill={color} />;
    x += width;
    return rect;
  });
}

function nordic(bg: string, cross: string, inner?: string): ReactNode {
  return (
    <>
      <rect width={30} height={20} fill={bg} />
      <rect x={8} y={0} width={5} height={20} fill={cross} />
      <rect x={0} y={7.5} width={30} height={5} fill={cross} />
      {inner && (
        <>
          <rect x={9.25} y={0} width={2.5} height={20} fill={inner} />
          <rect x={0} y={8.75} width={30} height={2.5} fill={inner} />
        </>
      )}
    </>
  );
}

function unionJack(w = 30, h = 20): ReactNode {
  return (
    <g>
      <rect width={w} height={h} fill="#012169" />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#fff" strokeWidth={h * 0.2} />
      <path d={`M0,0 L${w},${h} M${w},0 L0,${h}`} stroke="#C8102E" strokeWidth={h * 0.07} />
      <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke="#fff" strokeWidth={h * 0.33} />
      <path d={`M${w / 2},0 V${h} M0,${h / 2} H${w}`} stroke="#C8102E" strokeWidth={h * 0.2} />
    </g>
  );
}

const FLAGS: Record<string, () => ReactNode> = {
  FR: () => vStripes(['#002395', '#ffffff', '#ED2939']),
  IT: () => vStripes(['#009246', '#ffffff', '#CE2B37']),
  BE: () => vStripes(['#1a1a1a', '#FAE042', '#ED2939']),
  IE: () => vStripes(['#169B62', '#ffffff', '#FF883E']),
  CI: () => vStripes(['#F77F00', '#ffffff', '#009E60']),
  NG: () => vStripes(['#008751', '#ffffff', '#008751']),
  RO: () => vStripes(['#002B7F', '#FCD116', '#CE1126']),
  GN: () => vStripes(['#CE1126', '#FCD116', '#009460']),
  DE: () => hStripes(['#1a1a1a', '#DD0000', '#FFCE00']),
  NL: () => hStripes(['#AE1C28', '#ffffff', '#21468B']),
  RU: () => hStripes(['#ffffff', '#0039A6', '#D52B1E']),
  UA: () => hStripes(['#0057B7', '#FFD700']),
  PL: () => hStripes(['#ffffff', '#DC143C']),
  MC: () => hStripes(['#CE1126', '#ffffff']),
  AT: () => hStripes(['#ED2939', '#ffffff', '#ED2939']),
  HU: () => hStripes(['#CE2939', '#ffffff', '#477050']),
  LT: () => hStripes(['#FDB913', '#006A44', '#C1272D']),
  CO: () => hStripes(['#FCD116', '#003893', '#CE1126'], [2, 1, 1]),
  ES: () => hStripes(['#AA151B', '#F1BF00', '#AA151B'], [1, 2, 1]),
  SE: () => nordic('#006AA7', '#FECC00'),
  DK: () => nordic('#C8102E', '#ffffff'),
  FI: () => nordic('#ffffff', '#002F6C'),
  NO: () => nordic('#BA0C2F', '#ffffff', '#00205B'),
  GB: () => unionJack(),
  'GB-ENG': () => (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <rect x={12.5} width={5} height={20} fill="#CE1124" />
      <rect y={7.5} width={30} height={5} fill="#CE1124" />
    </>
  ),
  'GB-SCT': () => (
    <>
      <rect width={30} height={20} fill="#005EB8" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#fff" strokeWidth={3.2} />
    </>
  ),
  CH: () => (
    <>
      <rect width={30} height={20} fill="#DA291C" />
      <rect x={13} y={4} width={4} height={12} fill="#fff" />
      <rect x={9} y={8} width={12} height={4} fill="#fff" />
    </>
  ),
  GE: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <rect x={13} width={4} height={20} fill="#E8112D" />
      <rect y={8} width={30} height={4} fill="#E8112D" />
      {[
        [6.5, 4],
        [23.5, 4],
        [6.5, 16],
        [23.5, 16],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`} fill="#E8112D">
          <rect x={x - 0.6} y={y - 2} width={1.2} height={4} />
          <rect x={x - 2} y={y - 0.6} width={4} height={1.2} />
        </g>
      ))}
    </>
  ),
  US: () => (
    <>
      {Array.from({ length: 13 }, (_, i) => (
        <rect key={i} y={(i * 20) / 13} width={30} height={20 / 13 + 0.05} fill={i % 2 === 0 ? '#B22234' : '#ffffff'} />
      ))}
      <rect width={12} height={(20 * 7) / 13} fill="#3C3B6E" />
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={1.6 + (i % 4) * 2.9} cy={1.6 + Math.floor(i / 4) * 3.4} r={0.55} fill="#fff" />
      ))}
    </>
  ),
  BR: () => (
    <>
      <rect width={30} height={20} fill="#009C3B" />
      <polygon points="15,2.2 27.5,10 15,17.8 2.5,10" fill="#FFDF00" />
      <circle cx={15} cy={10} r={4.6} fill="#002776" />
      <path d="M10.6,9.2 Q15,7.6 19.4,10.6" stroke="#fff" strokeWidth={0.8} fill="none" />
    </>
  ),
  AR: () => (
    <>
      {hStripes(['#74ACDF', '#ffffff', '#74ACDF'])}
      <circle cx={15} cy={10} r={2.3} fill="#F6B40E" />
    </>
  ),
  UY: () => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} y={(i * 20) / 9} width={30} height={20 / 9 + 0.05} fill={i % 2 === 0 ? '#ffffff' : '#0038A8'} />
      ))}
      <rect width={11} height={(20 * 5) / 9} fill="#fff" />
      <circle cx={5.5} cy={5.5} r={2.8} fill="#FCD116" />
    </>
  ),
  PT: () => (
    <>
      {vStripes(['#006600', '#FF0000'], [2, 3])}
      <circle cx={12} cy={10} r={3.6} fill="#FFE000" />
      <circle cx={12} cy={10} r={2.2} fill="#FF0000" />
    </>
  ),
  JP: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <circle cx={15} cy={10} r={6} fill="#BC002D" />
    </>
  ),
  KR: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <circle cx={15} cy={10} r={5} fill="#003478" />
      <path d="M10,10 A5,5 0 0 1 20,10 A2.5,2.5 0 0 1 15,10 A2.5,2.5 0 0 0 10,10 Z" fill="#C60C30" />
      {[
        [5, 4],
        [25, 4],
        [5, 16],
        [25, 16],
      ].map(([x, y]) => (
        <g key={`${x}${y}`} fill="#1a1a1a">
          <rect x={x - 2.4} y={y - 1.9} width={4.8} height={0.9} />
          <rect x={x - 2.4} y={y - 0.45} width={4.8} height={0.9} />
          <rect x={x - 2.4} y={y + 1} width={4.8} height={0.9} />
        </g>
      ))}
    </>
  ),
  CN: () => (
    <>
      <rect width={30} height={20} fill="#DE2910" />
      <Star cx={5} cy={5} r={3} fill="#FFDE00" />
      <Star cx={10} cy={2} r={1} fill="#FFDE00" />
      <Star cx={12} cy={4} r={1} fill="#FFDE00" />
      <Star cx={12} cy={7} r={1} fill="#FFDE00" />
      <Star cx={10} cy={9} r={1} fill="#FFDE00" />
    </>
  ),
  CA: () => (
    <>
      {vStripes(['#D52B1E', '#ffffff', '#D52B1E'], [1, 2, 1])}
      <path
        d="M15,4 L16.1,6.3 L17.6,5.6 L17.1,8.6 L18.9,7.2 L19.4,8.3 L21,8 L20.3,10 L21.2,10.6 L17.9,13 L18.3,14.2 L15.4,13.8 L15.4,16.4 L14.6,16.4 L14.6,13.8 L11.7,14.2 L12.1,13 L8.8,10.6 L9.7,10 L9,8 L10.6,8.3 L11.1,7.2 L12.9,8.6 L12.4,5.6 L13.9,6.3 Z"
        fill="#D52B1E"
      />
    </>
  ),
  AU: () => (
    <>
      <rect width={30} height={20} fill="#00008B" />
      <svg x={0} y={0} width={15} height={10} viewBox="0 0 30 20">
        {unionJack()}
      </svg>
      <Star cx={7.5} cy={15} r={2.2} fill="#fff" />
      <Star cx={22.5} cy={4} r={1.1} fill="#fff" />
      <Star cx={19.5} cy={9} r={1.1} fill="#fff" />
      <Star cx={25.5} cy={8} r={1.1} fill="#fff" />
      <Star cx={22.5} cy={16} r={1.1} fill="#fff" />
    </>
  ),
  NZ: () => (
    <>
      <rect width={30} height={20} fill="#00247D" />
      <svg x={0} y={0} width={15} height={10} viewBox="0 0 30 20">
        {unionJack()}
      </svg>
      {[
        [22.5, 4.5],
        [19.5, 9.5],
        [25.5, 8.5],
        [22.5, 16],
      ].map(([x, y]) => (
        <g key={`${x}${y}`}>
          <Star cx={x} cy={y} r={1.5} fill="#fff" />
          <Star cx={x} cy={y} r={1} fill="#CC142B" />
        </g>
      ))}
    </>
  ),
  JM: () => (
    <>
      <rect width={30} height={20} fill="#009B3A" />
      <polygon points="0,0 13,10 0,20" fill="#1a1a1a" />
      <polygon points="30,0 17,10 30,20" fill="#1a1a1a" />
      <path d="M0,0 L30,20 M30,0 L0,20" stroke="#FED100" strokeWidth={3} />
    </>
  ),
  CM: () => (
    <>
      {vStripes(['#007A5E', '#CE1126', '#FCD116'])}
      <Star cx={15} cy={10} r={2.6} fill="#FCD116" />
    </>
  ),
  SN: () => (
    <>
      {vStripes(['#00853F', '#FDEF42', '#E31B23'])}
      <Star cx={15} cy={10} r={2.6} fill="#00853F" />
    </>
  ),
  GH: () => (
    <>
      {hStripes(['#CE1126', '#FCD116', '#006B3F'])}
      <Star cx={15} cy={10} r={2.8} fill="#1a1a1a" />
    </>
  ),
  BF: () => (
    <>
      {hStripes(['#EF2B2D', '#009E49'])}
      <Star cx={15} cy={10} r={3} fill="#FCD116" />
    </>
  ),
  ZA: () => (
    <>
      <rect width={30} height={10} fill="#E03C31" />
      <rect y={10} width={30} height={10} fill="#001489" />
      <path d="M0,0 L12,10 L0,20 M12,10 H30" stroke="#fff" strokeWidth={6.5} fill="none" />
      <path d="M0,0 L12,10 L0,20 M12,10 H30" stroke="#007749" strokeWidth={4} fill="none" />
      <polygon points="0,3.2 8.2,10 0,16.8" fill="#FFB81C" />
      <polygon points="0,5 6,10 0,15" fill="#1a1a1a" />
    </>
  ),
  SI: () => (
    <>
      {hStripes(['#ffffff', '#005DA4', '#ED1C24'])}
      <path d="M6,3 H11 V8 Q8.5,11 6,8 Z" fill="#005DA4" stroke="#ED1C24" strokeWidth={0.5} />
    </>
  ),
  HR: () => (
    <>
      {hStripes(['#FF0000', '#ffffff', '#171796'])}
      <rect x={12} y={5} width={6} height={8} fill="#fff" />
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={12 + (i % 3) * 2 + (Math.floor(i / 3) % 2)} y={5 + Math.floor(i / 3) * 2} width={1} height={2} fill="#FF0000" />
      ))}
    </>
  ),
  RS: () => hStripes(['#C6363C', '#0C4076', '#ffffff']),
  KE: () => (
    <>
      {hStripes(['#1a1a1a', '#ffffff', '#BB0000', '#ffffff', '#006600'], [6, 1, 6, 1, 6])}
      <ellipse cx={15} cy={10} rx={2.6} ry={5} fill="#BB0000" stroke="#fff" strokeWidth={0.4} />
      <ellipse cx={15} cy={10} rx={1} ry={3} fill="#1a1a1a" />
    </>
  ),
  TN: () => (
    <>
      <rect width={30} height={20} fill="#E70013" />
      <circle cx={15} cy={10} r={5} fill="#fff" />
      <circle cx={15.2} cy={10} r={3.6} fill="#E70013" />
      <circle cx={16.2} cy={10} r={2.9} fill="#fff" />
      <Star cx={16.3} cy={10} r={1.8} fill="#E70013" />
    </>
  ),
  DZ: () => (
    <>
      {vStripes(['#006633', '#ffffff'])}
      <circle cx={15} cy={10} r={4.4} fill="#D21034" />
      <circle cx={16.2} cy={10} r={3.6} fill="#fff" />
      <rect x={15} y={4} width={1.5} height={12} fill="#fff" />
      <rect x={16.5} y={4} width={0} height={0} />
      <circle cx={16.2} cy={10} r={3.6} fill="none" />
      <Star cx={17.4} cy={10} r={1.7} fill="#D21034" />
    </>
  ),
  MA: () => (
    <>
      <rect width={30} height={20} fill="#C1272D" />
      <polygon points={starPoints(15, 10.4, 4.6)} fill="none" stroke="#006233" strokeWidth={0.9} />
    </>
  ),
  EG: () => (
    <>
      {hStripes(['#CE1126', '#ffffff', '#1a1a1a'])}
      <path d="M13.4,8.2 L16.6,8.2 L16,11.6 L14,11.6 Z" fill="#C09300" />
    </>
  ),
  ET: () => (
    <>
      {hStripes(['#078930', '#FCDD09', '#DA121A'])}
      <circle cx={15} cy={10} r={4} fill="#0F47AF" />
      <polygon points={starPoints(15, 10.2, 2.6)} fill="none" stroke="#FCDD09" strokeWidth={0.5} />
    </>
  ),
  ER: () => (
    <>
      <polygon points="0,0 30,0 30,10 0,10" fill="#12AD2B" />
      <polygon points="0,10 30,10 30,20 0,20" fill="#4189DD" />
      <polygon points="0,0 30,10 0,20" fill="#EA0437" />
      <circle cx={7.5} cy={10} r={3} fill="none" stroke="#FFC726" strokeWidth={0.8} />
    </>
  ),
  GR: () => (
    <>
      {Array.from({ length: 9 }, (_, i) => (
        <rect key={i} y={(i * 20) / 9} width={30} height={20 / 9 + 0.05} fill={i % 2 === 0 ? '#0D5EAF' : '#ffffff'} />
      ))}
      <rect width={11.1} height={11.1} fill="#0D5EAF" />
      <rect x={4.44} width={2.22} height={11.1} fill="#fff" />
      <rect y={4.44} width={11.1} height={2.22} fill="#fff" />
    </>
  ),
  MX: () => (
    <>
      {vStripes(['#006847', '#ffffff', '#CE1126'])}
      <circle cx={15} cy={10} r={2.4} fill="#8C5A2B" />
      <path d="M12.6,11.6 Q15,14 17.4,11.6" stroke="#006847" strokeWidth={0.7} fill="none" />
    </>
  ),
  QA: () => (
    <>
      <rect width={30} height={20} fill="#8A1538" />
      <path
        d={`M0,0 H8 ${Array.from({ length: 9 }, (_, i) => `L11,${(i * 20) / 9 + 20 / 18} L8,${((i + 1) * 20) / 9}`).join(' ')} H0 Z`}
        fill="#fff"
      />
    </>
  ),
  PK: () => (
    <>
      <rect width={30} height={20} fill="#01411C" />
      <rect width={7.5} height={20} fill="#fff" />
      <circle cx={19} cy={10} r={5} fill="#fff" />
      <circle cx={20.4} cy={8.9} r={4.3} fill="#01411C" />
      <Star cx={22} cy={7.4} r={1.6} fill="#fff" />
    </>
  ),
  PH: () => (
    <>
      {hStripes(['#0038A8', '#CE1126'])}
      <polygon points="0,0 17.3,10 0,20" fill="#fff" />
      <circle cx={6} cy={10} r={2.2} fill="#FCD116" />
      <Star cx={2} cy={2.6} r={0.9} fill="#FCD116" />
      <Star cx={2} cy={17.4} r={0.9} fill="#FCD116" />
      <Star cx={14} cy={10} r={0.9} fill="#FCD116" />
    </>
  ),
  LC: () => (
    <>
      <rect width={30} height={20} fill="#66CCFF" />
      <polygon points="15,3 21,17 9,17" fill="#fff" />
      <polygon points="15,4.6 20,17 10,17" fill="#1a1a1a" />
      <polygon points="15,10 21,17 9,17" fill="#FCD116" />
    </>
  ),
  KZ: () => (
    <>
      <rect width={30} height={20} fill="#00AFCA" />
      <circle cx={15} cy={9} r={3.4} fill="#FEC50C" />
      <path d="M11,13.4 Q15,11.6 19,13.4" stroke="#FEC50C" strokeWidth={0.9} fill="none" />
      <rect x={2} y={1.5} width={1.2} height={17} fill="#FEC50C" opacity={0.85} />
    </>
  ),
  IN: () => (
    <>
      {hStripes(['#FF9933', '#ffffff', '#138808'])}
      <circle cx={15} cy={10} r={2.6} fill="none" stroke="#000080" strokeWidth={0.6} />
      <circle cx={15} cy={10} r={0.6} fill="#000080" />
    </>
  ),
  CZ: () => (
    <>
      {hStripes(['#ffffff', '#D7141A'])}
      <polygon points="0,0 15,10 0,20" fill="#11457E" />
    </>
  ),
  BW: () => (
    <>
      <rect width={30} height={20} fill="#75AADB" />
      <rect y={7.2} width={30} height={5.6} fill="#fff" />
      <rect y={8.2} width={30} height={3.6} fill="#1a1a1a" />
    </>
  ),
  // pays ajoutés avec les athlètes générés depuis Wikidata (emblèmes simplifiés)
  TR: () => (
    <>
      <rect width={30} height={20} fill="#E30A17" />
      <circle cx={11} cy={10} r={5} fill="#fff" />
      <circle cx={12.3} cy={10} r={4} fill="#E30A17" />
      <polygon points={starPoints(17.2, 10, 2.3, 180)} fill="#fff" />
    </>
  ),
  'GB-WLS': () => (
    <>
      {hStripes(['#ffffff', '#00B140'])}
      <path
        d="M7,12.5 L5.2,10.6 L6.6,10.4 L6.2,9 L8.3,10.3 C10,9.3 12.5,9.4 14.5,10 L16.5,6.2 L18.6,7.4 L21.4,5.8 L20.4,8.6 L18.4,10.2 C20.6,10.6 22.4,11.6 22.8,13 L25,12.2 L24.2,14.6 L22.6,14.5 L21.4,16.6 L20.4,14.8 L17.4,15.1 L16.6,17 L15.6,15.2 L12.6,15 L11.6,16.8 L10.8,14.8 C9,14.6 7.6,13.8 7,12.5 Z"
        fill="#D30731"
      />
    </>
  ),
  'GB-NIR': () => (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <rect x={12.5} width={5} height={20} fill="#CE1124" />
      <rect y={7.5} width={30} height={5} fill="#CE1124" />
      <polygon points={starPoints(15, 10, 3.4)} fill="#fff" />
      <circle cx={15} cy={10.4} r={1.2} fill="#CE1124" />
    </>
  ),
  LV: () => hStripes(['#9E3039', '#ffffff', '#9E3039'], [2, 1, 2]),
  LU: () => hStripes(['#ED2939', '#ffffff', '#00A1DE']),
  GA: () => hStripes(['#009E60', '#FCD116', '#3A75C4']),
  BG: () => hStripes(['#ffffff', '#00966E', '#D62612']),
  AM: () => hStripes(['#D90012', '#0033A0', '#F2A800']),
  CR: () => hStripes(['#002B7F', '#ffffff', '#CE1126', '#ffffff', '#002B7F'], [1, 1, 2, 1, 1]),
  EC: () => (
    <>
      {hStripes(['#FFDD00', '#034EA2', '#ED1C24'], [2, 1, 1])}
      <ellipse cx={15} cy={10} rx={2.2} ry={2.8} fill="#6E8B3D" stroke="#FFDD00" strokeWidth={0.5} />
    </>
  ),
  VE: () => (
    <>
      {hStripes(['#FFCC00', '#00247D', '#CF142B'])}
      {Array.from({ length: 8 }, (_, i) => {
        const angle = Math.PI * (1.15 + (i * 0.7) / 7);
        return <Star key={i} cx={15 + 5 * Math.cos(angle)} cy={12.4 + 5 * Math.sin(angle)} r={0.75} fill="#fff" />;
      })}
    </>
  ),
  CL: () => (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <rect y={10} width={30} height={10} fill="#D52B1E" />
      <rect width={10} height={10} fill="#0039A6" />
      <Star cx={5} cy={5} r={2.6} fill="#fff" />
    </>
  ),
  DO: () => (
    <>
      <rect width={30} height={20} fill="#ffffff" />
      <rect width={13} height={8.5} fill="#002D62" />
      <rect x={17} width={13} height={8.5} fill="#CE1126" />
      <rect y={11.5} width={13} height={8.5} fill="#CE1126" />
      <rect x={17} y={11.5} width={13} height={8.5} fill="#002D62" />
      <circle cx={15} cy={10} r={1.3} fill="#2E7D32" />
    </>
  ),
  CU: () => (
    <>
      {hStripes(['#002A8F', '#ffffff', '#002A8F', '#ffffff', '#002A8F'])}
      <polygon points="0,0 13,10 0,20" fill="#CF142B" />
      <Star cx={4.6} cy={10} r={2.3} fill="#fff" />
    </>
  ),
  UG: () => (
    <>
      {hStripes(['#000000', '#FCDC04', '#D90000', '#000000', '#FCDC04', '#D90000'])}
      <circle cx={15} cy={10} r={3.4} fill="#fff" />
      <circle cx={15} cy={10} r={1.2} fill="#9CA3AF" />
    </>
  ),
  CD: () => (
    <>
      <rect width={30} height={20} fill="#007FFF" />
      <path d="M0,20 L30,0" stroke="#F7D618" strokeWidth={7} />
      <path d="M0,20 L30,0" stroke="#CE1021" strokeWidth={4.6} />
      <Star cx={5.4} cy={4.4} r={3} fill="#F7D618" />
    </>
  ),
  SD: () => (
    <>
      {hStripes(['#D21034', '#ffffff', '#000000'])}
      <polygon points="0,0 11,10 0,20" fill="#007229" />
    </>
  ),
  SK: () => (
    <>
      {hStripes(['#ffffff', '#0B4EA2', '#EE1C25'])}
      <path d="M6,4.5 H13 V11 C13,13.6 11,15 9.5,15.8 C8,15 6,13.6 6,11 Z" fill="#EE1C25" stroke="#fff" strokeWidth={0.6} />
      <path d="M9.5,6.2 V13.2 M7.9,8 H11.1 M7.4,10 H11.6" stroke="#fff" strokeWidth={0.9} />
      <path d="M6.8,13.4 C8,12.2 11,12.2 12.2,13.4" fill="#0B4EA2" />
    </>
  ),
  LR: () => (
    <>
      {hStripes(Array.from({ length: 11 }, (_, i) => (i % 2 ? '#ffffff' : '#BF0A30')))}
      <rect width={9.1} height={9.1} fill="#002868" />
      <Star cx={4.55} cy={4.55} r={2.6} fill="#fff" />
    </>
  ),
  BA: () => (
    <>
      <rect width={30} height={20} fill="#002395" />
      <polygon points="8,0 22,0 22,20" fill="#FECB00" />
      {Array.from({ length: 7 }, (_, i) => (
        <Star key={i} cx={6.4 + i * 2.1} cy={1.2 + i * 2.9} r={0.9} fill="#fff" />
      ))}
    </>
  ),
  TG: () => (
    <>
      {hStripes(['#006A4E', '#FFCE00', '#006A4E', '#FFCE00', '#006A4E'])}
      <rect width={12} height={12} fill="#D21034" />
      <Star cx={6} cy={6} r={3} fill="#fff" />
    </>
  ),
  AL: () => (
    <>
      <rect width={30} height={20} fill="#E41E20" />
      <path
        d="M15,4.5 L16.2,6.5 L19.5,4.8 L18.6,7.4 L22.5,6.8 L20.4,9.4 L23,10.6 L19.6,11.6 L20.2,14.2 L16.8,13 L15,16 L13.2,13 L9.8,14.2 L10.4,11.6 L7,10.6 L9.6,9.4 L7.5,6.8 L11.4,7.4 L10.5,4.8 L13.8,6.5 Z"
        fill="#1a1a1a"
      />
    </>
  ),
  ZW: () => (
    <>
      {hStripes(['#006400', '#FFD200', '#D40000', '#000000', '#D40000', '#FFD200', '#006400'])}
      <polygon points="0,0 11,10 0,20" fill="#fff" stroke="#000" strokeWidth={0.6} />
      <Star cx={3.8} cy={10} r={2.2} fill="#D40000" />
    </>
  ),
  SY: () => (
    <>
      {hStripes(['#007A3D', '#ffffff', '#000000'])}
      <Star cx={10} cy={10} r={1.7} fill="#CE1126" />
      <Star cx={15} cy={10} r={1.7} fill="#CE1126" />
      <Star cx={20} cy={10} r={1.7} fill="#CE1126" />
    </>
  ),
  GQ: () => (
    <>
      {hStripes(['#3E9A00', '#ffffff', '#E32118'])}
      <polygon points="0,0 8,10 0,20" fill="#0073CE" />
      <rect x={14} y={8} width={3} height={4} rx={0.6} fill="#9CA3AF" />
    </>
  ),
  FJ: () => (
    <>
      <rect width={30} height={20} fill="#68BFE5" />
      <svg x={0} y={0} width={15} height={10} viewBox="0 0 30 20">
        {unionJack()}
      </svg>
      <path d="M19,5.5 H26 V11 C26,13.6 24,15.2 22.5,16 C21,15.2 19,13.6 19,11 Z" fill="#fff" stroke="#CE1126" strokeWidth={0.5} />
      <path d="M22.5,5.5 V16 M19,9 H26" stroke="#CE1126" strokeWidth={0.9} />
    </>
  ),
  CG: () => (
    <>
      <polygon points="0,0 20,0 0,20" fill="#009543" />
      <polygon points="30,0 30,20 10,20" fill="#DC241F" />
      <path d="M0,20 L20,0 H30 L10,20 Z" fill="#FBDE4A" />
    </>
  ),
  BD: () => (
    <>
      <rect width={30} height={20} fill="#006A4E" />
      <circle cx={13.5} cy={10} r={6} fill="#F42A41" />
    </>
  ),
  BO: () => hStripes(['#D52B1E', '#F9E300', '#007934']),
  SO: () => (
    <>
      <rect width={30} height={20} fill="#4189DD" />
      <Star cx={15} cy={10.4} r={5.2} fill="#ffffff" />
    </>
  ),
  KM: () => (
    <>
      {hStripes(['#FFC61E', '#ffffff', '#CE1126', '#3A75C4'])}
      <polygon points="0,0 13,10 0,20" fill="#3D8E33" />
      <circle cx={4.6} cy={10} r={3.4} fill="#ffffff" />
      <circle cx={5.9} cy={10} r={3} fill="#3D8E33" />
      {[7, 8.8, 11.2, 13].map((y) => (
        <Star key={y} cx={7.4} cy={y} r={0.75} fill="#ffffff" />
      ))}
    </>
  ),
  AE: () => (
    <>
      {hStripes(['#00732F', '#ffffff', '#000000'])}
      <rect width={8} height={20} fill="#FF0000" />
    </>
  ),
  UZ: () => (
    <>
      {hStripes(['#0099B5', '#CE1126', '#ffffff', '#CE1126', '#1EB53A'], [6.2, 0.4, 6.2, 0.4, 6.2])}
      <circle cx={5} cy={3.4} r={2.2} fill="#fff" />
      <circle cx={5.9} cy={3.4} r={2} fill="#0099B5" />
      {[0, 1, 2].map((i) => (
        <Star key={i} cx={9 + i * 2} cy={2.4} r={0.55} fill="#fff" />
      ))}
    </>
  ),
  BY: () => (
    <>
      <rect width={30} height={13.3} fill="#C8313E" />
      <rect y={13.3} width={30} height={6.7} fill="#4AA657" />
      <rect width={3.6} height={20} fill="#fff" />
      {Array.from({ length: 5 }, (_, i) => (
        <polygon key={i} points={`1.8,${1 + i * 4} 3,${3 + i * 4} 1.8,${5 + i * 4} 0.6,${3 + i * 4}`} fill="#C8313E" />
      ))}
    </>
  ),
  // pays des pongistes, joueurs d'échecs et joueurs d'esport
  SA: () => (
    <>
      <rect width={30} height={20} fill="#006C35" />
      <path d="M8,8.4 Q10,6.4 12,8.4 T16,8.4 T20,8.4 T22,7.6" stroke="#fff" strokeWidth={1} fill="none" />
      <path d="M8.5,12.8 H21.5 L20.2,11.9" stroke="#fff" strokeWidth={0.9} fill="none" />
    </>
  ),
  TW: () => (
    <>
      <rect width={30} height={20} fill="#FE0000" />
      <rect width={15} height={10} fill="#000095" />
      <polygon points={sunPoints(7.5, 5, 3.7, 12)} fill="#fff" />
      <circle cx={7.5} cy={5} r={2} fill="#000095" />
      <circle cx={7.5} cy={5} r={1.65} fill="#fff" />
    </>
  ),
  HK: () => (
    <>
      <rect width={30} height={20} fill="#DE2910" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <ellipse key={angle} cx={15} cy={6.9} rx={1.9} ry={3.1} fill="#fff" transform={`rotate(${angle} 15 10)`} />
      ))}
    </>
  ),
  SG: () => (
    <>
      {hStripes(['#EF3340', '#ffffff'])}
      <circle cx={6} cy={5} r={3.3} fill="#fff" />
      <circle cx={7.3} cy={5} r={3.05} fill="#EF3340" />
      {[
        [9.8, 3.5],
        [11.3, 4.6],
        [10.7, 6.4],
        [8.9, 6.4],
        [8.3, 4.6],
      ].map(([x, y]) => (
        <Star key={`${x}-${y}`} cx={x} cy={y} r={0.7} fill="#fff" />
      ))}
    </>
  ),
  EE: () => hStripes(['#0072CE', '#000000', '#ffffff']),
  IL: () => (
    <>
      <rect width={30} height={20} fill="#fff" />
      <rect y={2.2} width={30} height={2.6} fill="#0038B8" />
      <rect y={15.2} width={30} height={2.6} fill="#0038B8" />
      <polygon points="15,6.2 18.3,11.9 11.7,11.9" fill="none" stroke="#0038B8" strokeWidth={0.8} />
      <polygon points="15,13.8 11.7,8.1 18.3,8.1" fill="none" stroke="#0038B8" strokeWidth={0.8} />
    </>
  ),
  AZ: () => (
    <>
      {hStripes(['#00B5E2', '#EF3340', '#509E2F'])}
      <circle cx={14} cy={10} r={2.6} fill="#fff" />
      <circle cx={14.8} cy={10} r={2.1} fill="#EF3340" />
      <polygon points={sunPoints(17.7, 10, 1.3, 8)} fill="#fff" />
    </>
  ),
  IR: () => (
    <>
      {hStripes(['#239F40', '#ffffff', '#DA0000'])}
      <path
        d="M15,7.4 C13.4,8.4 13.4,11.2 15,12.4 C16.6,11.2 16.6,8.4 15,7.4 Z M13.2,8.2 C12,9.6 12.4,11.6 13.8,12.4 M16.8,8.2 C18,9.6 17.6,11.6 16.2,12.4"
        fill="none"
        stroke="#DA0000"
        strokeWidth={0.7}
      />
    </>
  ),
  JO: () => (
    <>
      {hStripes(['#000000', '#ffffff', '#007A3D'])}
      <polygon points="0,0 15,10 0,20" fill="#CE1126" />
      <Star cx={4.8} cy={10} r={1.6} fill="#fff" />
    </>
  ),
  KP: () => (
    <>
      {hStripes(['#024FA2', '#ffffff', '#ED1C27', '#ffffff', '#024FA2'], [3, 0.6, 11, 0.6, 3])}
      <circle cx={10} cy={10} r={3.6} fill="#fff" />
      <Star cx={10} cy={10} r={3.4} fill="#ED1C27" />
    </>
  ),
  VN: () => (
    <>
      <rect width={30} height={20} fill="#DA251D" />
      <Star cx={15} cy={10.4} r={6} fill="#FFFF00" />
    </>
  ),
  TH: () => hStripes(['#A51931', '#F4F5F8', '#2D2A4A', '#F4F5F8', '#A51931'], [1, 1, 2, 1, 1]),
  MN: () => (
    <>
      {vStripes(['#C4272F', '#015197', '#C4272F'])}
      <circle cx={5} cy={6} r={1.2} fill="#F9CF02" />
      <rect x={3.6} y={8} width={2.8} height={1} fill="#F9CF02" />
      <rect x={3.6} y={10} width={2.8} height={4.5} fill="none" stroke="#F9CF02" strokeWidth={0.7} />
    </>
  ),
  TJ: () => (
    <>
      {hStripes(['#CC0000', '#ffffff', '#006600'], [2, 3, 2])}
      <path d="M13,11 L13.6,8.8 L15,10 L16.4,8.8 L17,11 Z" fill="#F8C300" />
    </>
  ),
  // ───── drapeaux ajoutés pour AnimalCards ─────
  MG: () => (
    <>
      <rect width={10} height={20} fill="#ffffff" />
      <rect x={10} width={20} height={10} fill="#FC3D32" />
      <rect x={10} y={10} width={20} height={10} fill="#007E3A" />
    </>
  ),
  ID: () => hStripes(['#CE1126', '#ffffff']),
  MY: () => (
    <>
      {hStripes(Array.from({ length: 14 }, (_, i) => (i % 2 ? '#ffffff' : '#CC0001')))}
      <rect width={15} height={11.43} fill="#010066" />
      <circle cx={6} cy={5.7} r={3.7} fill="#FFCC00" />
      <circle cx={7.3} cy={5.7} r={3.1} fill="#010066" />
      <polygon points={sunPoints(11.6, 5.7, 2.5, 14, 0.45)} fill="#FFCC00" />
    </>
  ),
  PE: () => vStripes(['#D91023', '#ffffff', '#D91023']),
  TZ: () => (
    <>
      <polygon points="0,0 30,0 0,20" fill="#1EB53A" />
      <polygon points="30,0 30,20 0,20" fill="#00A3DD" />
      <path d="M0,20 L30,0" stroke="#FCD116" strokeWidth={7} />
      <path d="M0,20 L30,0" stroke="#000000" strokeWidth={5} />
    </>
  ),
  NP: () => (
    <>
      <rect width={30} height={20} fill="#e9edf3" />
      <polygon points="8,1 22,10.4 12,10.4 22,19 8,19" fill="#DC143C" stroke="#003893" strokeWidth={1} strokeLinejoin="round" />
      <circle cx={11.4} cy={7.6} r={1.5} fill="#ffffff" />
      <polygon points={sunPoints(11.6, 15, 2, 12, 0.6)} fill="#ffffff" />
    </>
  ),
  PG: () => (
    <>
      <polygon points="0,0 30,0 30,20" fill="#CE1126" />
      <polygon points="0,0 0,20 30,20" fill="#000000" />
      <path d="M17,4 Q22,2.8 25,5.8 Q23,7 21,6.5 Q24,9 26,12 Q22,10.2 19.6,8 Q18,6.8 17,4 Z" fill="#FCD116" />
      <Star cx={7} cy={10} r={1.2} fill="#ffffff" />
      <Star cx={10.4} cy={13} r={1.2} fill="#ffffff" />
      <Star cx={7} cy={16.6} r={1.2} fill="#ffffff" />
      <Star cx={4} cy={13.4} r={1.2} fill="#ffffff" />
    </>
  ),
  IS: () => nordic('#02529C', '#ffffff', '#DC1E35'),
  AQ: () => (
    <>
      <rect width={30} height={20} fill="#3A7DCE" />
      <path d="M9,9 Q10,6 13,6.5 Q15,5 17.5,6 Q20.5,6.2 21,8.5 Q22.5,10 21,12 Q20,14.5 16.5,14 Q14,15.2 12,13.6 Q9.5,13.6 9.6,11.6 Q8,10.6 9,9 Z" fill="#ffffff" />
      <path d="M9.6,11.8 Q7.6,12.6 6.2,14.4" stroke="#ffffff" strokeWidth={0.9} fill="none" strokeLinecap="round" />
    </>
  ),
  NA: () => (
    <>
      <polygon points="0,0 30,0 0,20" fill="#003580" />
      <polygon points="30,0 30,20 0,20" fill="#009543" />
      <path d="M0,20 L30,0" stroke="#ffffff" strokeWidth={7} />
      <path d="M0,20 L30,0" stroke="#D21034" strokeWidth={5} />
      <polygon points={sunPoints(6, 5.4, 3, 12, 0.6)} fill="#FFCE00" />
    </>
  ),
  RW: () => (
    <>
      {hStripes(['#00A1DE', '#FAD201', '#20603D'], [2, 1, 1])}
      <polygon points={sunPoints(24.5, 5, 3, 24, 0.65)} fill="#E5BE01" />
    </>
  ),
  LK: () => (
    <>
      <rect width={30} height={20} fill="#FFBE29" />
      <rect x={1} y={1} width={4} height={18} fill="#00534E" />
      <rect x={5.4} y={1} width={4} height={18} fill="#EB7400" />
      <rect x={10.4} y={1} width={18.6} height={18} fill="#8D153A" />
      <path d="M15,14 Q14,9 17,7 Q19,5 21,7 Q23,6 24,8 Q23,10 22,10 L23,14 Z" fill="#FFBE29" />
    </>
  ),
  MU: () => hStripes(['#EA2839', '#1A206D', '#FFD500', '#00A551']),
  SC: () => (
    <>
      <polygon points="0,20 0,0 10,0" fill="#003F87" />
      <polygon points="0,20 10,0 20,0" fill="#FCD856" />
      <polygon points="0,20 20,0 30,0 30,6.67" fill="#D62828" />
      <polygon points="0,20 30,6.67 30,13.33" fill="#ffffff" />
      <polygon points="0,20 30,13.33 30,20" fill="#007A3D" />
    </>
  ),
  GL: () => (
    <>
      {hStripes(['#ffffff', '#D00C33'])}
      <path d="M5,10 A6.7,6.7 0 0 1 18.4,10 Z" fill="#D00C33" />
      <path d="M5,10 A6.7,6.7 0 0 0 18.4,10 Z" fill="#ffffff" />
    </>
  ),
  GT: () => (
    <>
      {vStripes(['#4997D0', '#ffffff', '#4997D0'])}
      <circle cx={15} cy={10} r={2.6} fill="none" stroke="#6C9C3C" strokeWidth={0.9} />
    </>
  ),
  // océans : les espèces qui vivent dans toutes les mers
  XO: () => (
    <>
      <rect width={30} height={20} fill="#0B4F8A" />
      <path d="M0,7.5 Q3.75,5 7.5,7.5 T15,7.5 T22.5,7.5 T30,7.5 M0,13.5 Q3.75,11 7.5,13.5 T15,13.5 T22.5,13.5 T30,13.5" stroke="#8FD3FF" strokeWidth={1.4} fill="none" />
    </>
  ),
  // plusieurs continents : les espèces présentes sur plusieurs continents (le chat, le loup…)
  XW: () => (
    <>
      <rect width={30} height={20} fill="#123A5C" />
      <circle cx={15} cy={10} r={7} fill="#2F80C9" stroke="#CFE8FF" strokeWidth={0.7} />
      <path d="M8,10 H22 M15,3 V17" stroke="#CFE8FF" strokeWidth={0.6} />
      <ellipse cx={15} cy={10} rx={3.2} ry={7} fill="none" stroke="#CFE8FF" strokeWidth={0.6} />
    </>
  ),
};

/** Pays dont le drapeau est dessiné (planche de contrôle #galerie). */
export const FLAG_CODES = Object.keys(FLAGS);

interface FlagProps {
  code: string;
  className?: string;
  title?: boolean;
}

/** Drapeau pas encore dessiné : un fanion sobre avec le code du pays. */
function FallbackFlag({ code }: { code: string }) {
  const label = code.includes('-') ? code.split('-')[1] : code;
  return (
    <>
      <rect width={30} height={20} fill="#2b3346" />
      <rect y={15.5} width={30} height={4.5} fill="#3a4560" />
      <text x={15} y={12.2} textAnchor="middle" fontFamily="var(--font-data)" fontWeight={800} fontSize={label.length > 2 ? 7.4 : 8.6} fill="#e8ecf5" letterSpacing={0.4}>
        {label}
      </text>
    </>
  );
}

export function Flag({ code, className, title = true }: FlagProps) {
  const draw = FLAGS[code];
  const name = countryName(code);
  return (
    <svg className={className} viewBox="0 0 30 20" role="img" aria-label={name} preserveAspectRatio="xMidYMid slice">
      {title && <title>{name}</title>}
      {draw ? draw() : <FallbackFlag code={code} />}
      <rect width={30} height={20} fill="none" stroke="rgba(0,0,0,.25)" strokeWidth={0.8} />
    </svg>
  );
}
