import { memo, useCallback, useRef, useState, type CSSProperties, type PointerEvent } from 'react';
import type { Athlete, CardFace, OwnedCard, RarityId } from '../engine/types';
import { collectionNumber, displayName, extinctionLabel, getAthlete, isIcon, rarityOf } from '../engine/cards';
import { SPORTS } from '../data/sports';
import { mesuresOf, type MesuresAffichees } from '../data/mesures';
import { populationOf, type PopulationAffichee } from '../data/populations';
import { usePhoto } from '../photos';
import { Flag } from './Flag';
import { Bust } from './Bust';
import { SportIcon } from './SportIcon';
import { PackScene } from './PackScene';

// Carte au style « cadre de naturaliste » : palette de booster selon le palier (forêt, cimes, savane…),
// cadre sombre avec code de l'espèce en onglet, losange avec le numéro de collection, famille écrite à la verticale,
// photo dans une fenêtre, médaillon de la famille, bandeau du nom et plaque du milieu de vie.
// 1em = largeur de la carte / 24. Le cadre est un SVG en 100 × 140 (proportions de la carte).

export type CardSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const WIDTHS: Record<CardSize, number> = { xs: 104, sm: 140, md: 196, lg: 250, xl: 300 };

/** Nom du palier affiché au-dessus du numéro : le paysage de sa palette (comme les boosters). */
const TIERS: Record<RarityId, string> = {
  commune: 'Forêt',
  'peu-commune': 'Cimes',
  rare: 'Savane',
  epique: 'Aurore',
  legendaire: 'Légende',
};

interface CardProps {
  card: CardFace | OwnedCard;
  size?: CardSize;
  /** inclinaison 3D + reflet qui suit le doigt / la souris */
  tilt?: boolean;
  /** carte non possédée (album) */
  locked?: boolean;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
}

function plain(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z\s-]/g, '');
}

// Mots qui ne disent pas de quel animal il s'agit : « Grand requin blanc » donne REQ, « Petite roussette » ROU.
const SKIPPED = new Set(['GRAND', 'GRANDE', 'PETIT', 'PETITE', 'LE', 'LA', 'LES', 'DE', 'DU', 'DES', 'D', 'L']);

/** Code en 3 lettres de l'onglet : « LIO » pour le lion, « REQ » pour le grand requin blanc. */
export function athleteCode(athlete: Athlete): string {
  const parts = plain(`${athlete.first} ${athlete.last}`).split(/[\s’'-]+/).filter(Boolean);
  const main = parts.find((part) => part.length >= 3 && !SKIPPED.has(part)) ?? parts[0] ?? '';
  return main.slice(0, 3);
}

/** Taille du nom : le serif est plus large qu'une police condensée, on réduit pour les noms longs. */
function nameSize(name: string): number {
  return Math.min(1.9, 20.5 / Math.max(name.length, 1));
}

/** Cadre sombre percé de deux fenêtres (photo et plaque du poste). */
const PANEL =
  'M6.8 2.6 H93.2 Q96.4 2.6 96.4 5.8 V133.8 Q96.4 137 93.2 137 H6.8 Q3.6 137 3.6 133.8 V5.8 Q3.6 2.6 6.8 2.6 Z';
const WINDOW =
  'M9.4 14 Q9.4 11.2 12.2 11.2 H21.5 C25.8 11.2 26.4 4.6 31 4.6 H91.6 Q94.2 4.6 94.2 7.2 V113.4 Q94.2 116 91.6 116 H12 Q9.4 116 9.4 113.4 Z';
const PLATE = 'M20 128.2 H92.4 Q94.2 128.2 94.2 130 V133 Q94.2 134.8 92.4 134.8 H20 Z';

function Frame() {
  return (
    <svg className="card__frame" viewBox="0 0 100 140" preserveAspectRatio="none" aria-hidden="true">
      <path className="card__panel" d={`${PANEL} ${WINDOW} ${PLATE}`} fillRule="evenodd" />
      <path className="card__trim" d={PANEL} />
      <rect className="card__trim card__trim--thin" x="4.7" y="3.7" width="90.6" height="132.2" rx="2.4" />
      <path className="card__trim card__trim--window" d={WINDOW} />
      <rect className="card__trim card__trim--thin" x="25.5" y="117.6" width="68.7" height="9.2" rx="1.2" />
      <path className="card__trim" d={PLATE} />
      <g className="card__rail">
        <path d="M6.5 24 V36 M6.5 70 V81 M6.5 91 V105" />
        <path className="card__diamond" d="M6.5 83.2 L7.7 86 L6.5 88.8 L5.3 86 Z" />
      </g>
    </svg>
  );
}

export const Card = memo(function Card({ card, size = 'md', tilt = false, locked = false, onClick, className = '', style }: CardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const [photoFailed, setPhotoFailed] = useState(false);
  const athlete = getAthlete(card.athleteId);
  const variant = card.variant;
  const rarity = rarityOf(athlete);
  const icon = isIcon(athlete);
  const prime = variant === 'prime';
  const reverse = variant === 'reverse';
  const sport = SPORTS[athlete.sport];
  const width = WIDTHS[size];
  const tiny = size === 'xs';
  const compact = size === 'xs' || size === 'sm';
  const photo = usePhoto(athlete);
  const showPhoto = !!photo.src && !photoFailed;
  const fullName = compact ? athlete.last : displayName(athlete);
  const habitat = athlete.habitat;
  const mesures = habitat ? null : mesuresOf(athlete.id);
  const population = populationOf(athlete);
  const tier = habitat ? 'Habitat' : prime ? 'Prime' : reverse ? 'Reverse' : icon ? 'Icône' : TIERS[rarity.id];
  // le losange porte le numéro de la carte dans l'album
  const number = collectionNumber(athlete);
  const subtitle = [athlete.role, extinctionLabel(athlete)].filter(Boolean).join(' · ');

  const handleMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!tilt || !ref.current) return;
      const rect = ref.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(() => {
        const el = ref.current;
        if (!el) return;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
        el.style.setProperty('--my', `${(y * 100).toFixed(1)}%`);
        el.style.setProperty('--rx', `${((0.5 - y) * 16).toFixed(2)}deg`);
        el.style.setProperty('--ry', `${((x - 0.5) * 20).toFixed(2)}deg`);
        el.dataset.active = 'true';
      });
    },
    [tilt],
  );

  const handleLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(frame.current);
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
    el.dataset.active = 'false';
  }, []);

  const classes = [
    'card',
    `card--${size}`,
    `r-${rarity.id}`,
    `s-${athlete.sport}`,
    icon ? 'is-icon' : '',
    prime ? 'is-prime' : '',
    reverse ? 'is-reverse' : '',
    habitat ? 'is-habitat' : '',
    compact ? 'is-compact' : '',
    tiny ? 'is-tiny' : '',
    locked ? 'is-locked' : '',
    tilt ? 'has-tilt' : '',
    onClick ? 'is-clickable' : '',
    showPhoto ? (photo.cutout ? 'has-cutout' : 'has-photo') : habitat ? 'has-landscape' : 'has-bust',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const ariaLabel = habitat
    ? `${athlete.last}, carte Habitat n° ${number}, ${athlete.role}`
    : `${displayName(athlete)}, ${rarity.name}${prime ? ' Prime' : ''}${reverse ? ' Reverse' : ''}${icon ? ', Icône' : ''}, n° ${number}`;

  return (
    <div
      ref={ref}
      className={classes}
      style={{ ['--card-w' as string]: `${width}px`, ['--sport' as string]: sport.color, ...style }}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      onClick={onClick}
      role={onClick ? 'button' : 'img'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="card__body">
        <div className="card__bg" />

        <div className="card__window">
          <div className="card__scene" />
          <div className="card__player">
            {habitat && !showPhoto ? (
              // en attendant sa photo, un Habitat montre son paysage peint
              <PackScene scene={habitat.scene} seed={athlete.id} className="card__landscape" shade={false} />
            ) : showPhoto ? (
              <img className="card__photo" src={photo.src} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setPhotoFailed(true)} />
            ) : (
              <Bust color={sport.color} sport={athlete.sport} className="card__bust" />
            )}
          </div>
        </div>

        <Frame />
        <div className="card__hills" aria-hidden="true" />

        <div className="card__code metal-text">{athleteCode(athlete)}</div>

        <div className="card__badge">
          <span className="card__tier">
            <i>{tier}</i>
          </span>
          <span className="card__rating" title={`Carte n° ${number}`}>
            <b className="metal-text">{number}</b>
          </span>
        </div>

        {!tiny && <Flag code={athlete.country} className="card__flag" />}

        {!tiny && (
          <div className="card__sport" aria-hidden="true" style={{ fontSize: `${sport.name.length > 12 ? 0.62 : 0.8}em` }}>
            {sport.name}
          </div>
        )}

        <div className="card__medal" title={sport.name}>
          <span>
            <SportIcon sport={athlete.sport} />
          </span>
        </div>

        {!tiny && habitat && <HabitatFacts especes={habitat.especes.length} />}
        {!tiny && !habitat && (mesures || population) && <Facts mesures={mesures} population={population} compact={compact} />}

        <div className="card__banner">
          <span className="card__name metal-text" style={{ fontSize: `${nameSize(fullName) * (compact ? 1.08 : 1)}em` }}>
            {fullName}
          </span>
        </div>

        {!tiny && (
          <div className="card__subtitle">
            <span>{subtitle}</span>
          </div>
        )}

        {!compact && athlete.latin && <div className="card__latin">{athlete.latin}</div>}

        <div className="card__holo" aria-hidden="true" />
        <div className="card__shine" aria-hidden="true" />
      </div>
    </div>
  );
});

/** Pictogrammes des mesures, au trait (viewBox 16 × 16). */
const FACT_ICONS = {
  // poids : un poids de balance à anse
  poids: 'M5.5 5.5 C5.5 3.2 10.5 3.2 10.5 5.5 M3.5 6.5 H12.5 L14 13.5 H2 Z',
  // longueur : une flèche à deux pointes, horizontale
  L: 'M1.5 8 H14.5 M4 5.5 L1.5 8 L4 10.5 M12 5.5 L14.5 8 L12 10.5',
  // hauteur : la même, verticale
  H: 'M8 1.5 V14.5 M5.5 4 L8 1.5 L10.5 4 M5.5 12 L8 14.5 L10.5 12',
  // envergure : deux ailes déployées
  E: 'M8 9.5 C6 6 3.5 5.5 1 6.5 C3 7.5 5 8.5 8 9.5 C11 8.5 13 7.5 15 6.5 C12.5 5.5 10 6 8 9.5 Z',
  // longévité : un sablier
  vie: 'M4 1.5 H12 M4 14.5 H12 M5 1.5 C5 6 11 6 11 8 C11 10 5 10 5 14.5 M11 1.5 C11 6 5 6 5 8 C5 10 11 10 11 14.5',
  // population restante : la Terre, méridien et parallèle
  pop: 'M8 1.5 A6.5 6.5 0 1 1 7.99 1.5 Z M1.5 8 H14.5 M8 1.5 C5 4 5 12 8 14.5 C11 12 11 4 8 1.5',
  // espèce éteinte : une croix
  eteint: 'M4 4 L12 12 M12 4 L4 12',
  // espèces d'un habitat : une empreinte de patte
  especes: 'M8 9.5 C5 9.5 4 13.5 6 14 C7 14.2 7.5 13.4 8 13.4 C8.5 13.4 9 14.2 10 14 C12 13.5 11 9.5 8 9.5 Z M4 7 A1.3 1.6 0 1 1 4 7.01 M6.6 4.5 A1.3 1.6 0 1 1 6.6 4.51 M9.4 4.5 A1.3 1.6 0 1 1 9.4 4.51 M12 7 A1.3 1.6 0 1 1 12 7.01',
} as const;

function FactIcon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/**
 * Bandeau des mesures en bas de la photo : poids, taille et population restante sur Terre
 * (les petites cartes gardent le poids et la population).
 */
function Facts({ mesures, population, compact }: { mesures: MesuresAffichees | null; population: PopulationAffichee | null; compact: boolean }) {
  const sens = mesures?.tailleLabel === 'Hauteur' ? 'H' : mesures?.tailleLabel === 'Envergure' ? 'E' : 'L';
  const items: Array<{ key: string; icon: string; value: string; label: string; extinct?: boolean }> = [];
  if (mesures?.poids) items.push({ key: 'poids', icon: FACT_ICONS.poids, value: mesures.poids, label: 'Poids' });
  if (!compact && mesures?.taille) items.push({ key: 'taille', icon: FACT_ICONS[sens], value: mesures.taille, label: mesures.tailleLabel });
  if (population)
    items.push({
      key: 'pop',
      icon: population.extinct ? FACT_ICONS.eteint : FACT_ICONS.pop,
      value: population.value,
      label: population.extinct ? 'Espèce éteinte' : `${population.label} estimée`,
      extinct: population.extinct,
    });
  if (!items.length) return null;
  return (
    <div className="card__facts" aria-label={items.map((item) => `${item.label} ${item.value}`).join(', ')}>
      {items.map((item) => (
        <span key={item.key} className={`card__fact card__fact--${item.key}${item.extinct ? ' is-extinct' : ''}`} title={item.label}>
          <FactIcon d={item.icon} />
          {item.value}
        </span>
      ))}
    </div>
  );
}

/** Bandeau d'une carte Habitat : le nombre d'espèces du jeu qui y vivent (la superficie est dans la fiche). */
function HabitatFacts({ especes }: { especes: number }) {
  return (
    <div className="card__facts" aria-label={`${especes} espèces du jeu y vivent`}>
      <span className="card__fact" title="Espèces du jeu qui y vivent">
        <FactIcon d={FACT_ICONS.especes} />
        {especes} espèces
      </span>
    </div>
  );
}
