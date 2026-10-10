import type { ReactNode } from 'react';
import type { CardFace } from '../engine/types';
import { collectionNumber, displayName, getAthlete, rarityOf } from '../engine/cards';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import { mesuresOf } from '../data/mesures';
import { populationOf } from '../data/populations';
import { Flag, countryName } from './Flag';
import { Encyclopedie } from './Encyclopedie';
import { encyclopedieOf } from '../data/encyclopedie';

// Fiche express d'une carte, à l'ouverture des boosters : de vraies informations sur l'espèce.
// Nom scientifique, mesures d'un adulte, population restante, une anecdote, l'histoire de l'individu
// célèbre pour une version Prime, et les icônes « En savoir plus » (menu, vitesse, statut…). Une carte Habitat montre son lieu, sa superficie et les animaux qui y vivent.

interface CardStatsProps {
  card: CardFace;
  /** action affichée en bas de la fiche (ex. ouvrir la fiche complète) */
  children?: ReactNode;
  className?: string;
}

export function CardStats({ card, children, className = '' }: CardStatsProps) {
  const athlete = getAthlete(card.athleteId);
  const rarity = rarityOf(athlete);
  const prime = card.variant === 'prime';
  const reverse = card.variant === 'reverse';
  const habitat = athlete.habitat;
  const mesures = habitat ? null : mesuresOf(athlete.id);
  const population = populationOf(athlete);
  const facts: Array<[string, string]> = [];
  if (mesures?.poids) facts.push(['Poids', mesures.poids]);
  if (mesures?.taille) facts.push([mesures.tailleLabel, mesures.taille]);
  if (mesures?.longevite) facts.push(['Longévité', mesures.longevite]);
  if (population) facts.push([population.extinct ? 'Statut' : population.label, population.extinct ? 'Espèce éteinte' : population.value]);
  const vitesse = habitat ? undefined : encyclopedieOf(athlete.id)?.vitesse;
  if (vitesse) facts.push(['Vitesse max', `${vitesse.kmh.toLocaleString('fr-FR')} km/h`]);
  if (habitat) facts.push(['Superficie', habitat.superficie]);
  const inhabitants = habitat?.especes.map((id) => ATHLETES_BY_ID[id]).filter(Boolean) ?? [];

  return (
    <section
      key={`${card.athleteId}-${card.variant}`}
      className={`card-stats card-stats--${habitat ? 'habitat' : prime ? 'prime' : rarity.id} ${className}`}
      aria-live="polite"
      aria-label={displayName(athlete)}
    >
      <header className="card-stats__head">
        <div className="card-stats__who">
          <div className="card-stats__chips">
            <span className={`chip-rarity chip-rarity--${rarity.id}`}>{rarity.name}</span>
            {prime && <span className="chip-rarity chip-rarity--prime">Prime{athlete.prime ? ` ${athlete.prime.year}` : ''}</span>}
            {reverse && <span className="chip-rarity chip-rarity--reverse">Reverse</span>}
            {habitat && <span className="chip-rarity chip-rarity--habitat">Habitat</span>}
          </div>
          <h3 className="card-stats__name">{displayName(athlete)}</h3>
          {athlete.latin && <p className="card-stats__latin">{athlete.latin}</p>}
          <p className="card-stats__meta">
            <Flag code={athlete.country} className="card-stats__flag" />
            <span>
              {habitat
                ? athlete.role
                : [countryName(athlete.country), SPORTS[athlete.sport].name, athlete.role !== SPORTS[athlete.sport].name && athlete.role].filter(Boolean).join(' · ')}
            </span>
          </p>
        </div>
        <div className="card-stats__ovr">
          <b>{collectionNumber(athlete)}</b>
          <span>N°</span>
        </div>
      </header>

      {facts.length > 0 && (
        <dl className="card-stats__facts">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {prime && athlete.prime && (
        <p className="card-stats__story">
          <span className="card-stats__label">Prime {athlete.prime.year}</span>
          {athlete.prime.note}
        </p>
      )}

      <p className="card-stats__story">
        <span className="card-stats__label">Le savais-tu ?</span>
        {athlete.fact}
      </p>

      {!habitat && <Encyclopedie athleteId={athlete.id} name={displayName(athlete)} />}

      {habitat && (
        <>
          {habitat.protection && <p className="muted small card-stats__protection">{habitat.protection}</p>}
          <p className="card-stats__story">
            <span className="card-stats__label">Ils y vivent</span>
            {inhabitants.map((a) => a.last).join(', ')}.
          </p>
        </>
      )}
      {children}
    </section>
  );
}
