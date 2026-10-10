import { useEffect, useState, type ReactNode } from 'react';
import { REGIMES, RYTHMES, UICN, UICN_ECHELLE, encyclopedieOf, type Encyclo, type Rythme, type Uicn } from '../data/encyclopedie';

// « En savoir plus » dans la fiche d'une carte : une rangée de petites icônes (menu, vitesse, jour ou nuit,
// vie de groupe, petits, protection, anecdote) ; on en touche une pour déplier son panneau.
// Les icônes donnent déjà un indice d'un coup d'œil : soleil ou lune, couleur du statut de protection.

type Topic = 'menu' | 'vitesse' | 'rythme' | 'social' | 'petits' | 'protection' | 'savais';

/** Termine une phrase par un point s'il n'y en a pas déjà un. */
const phrase = (text: string) => (/[.!?…]$/.test(text) ? text : `${text}.`);

/** Vitesse de pointe d'Usain Bolt, pour comparer. */
const BOLT_KMH = 45;

const svg = (children: ReactNode) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    {children}
  </svg>
);

const ICONS: Record<Exclude<Topic, 'rythme' | 'petits'>, ReactNode> = {
  // fourchette et couteau
  menu: svg(
    <>
      <path d="M7,3 V10 M5,3 V8 A2,2 0 0 0 9,8 V3 M7,10 V21" />
      <path d="M16,21 V3 C13.5,4.5 13,8 13,12 H16" />
    </>,
  ),
  // compteur de vitesse
  vitesse: svg(
    <>
      <path d="M4,17 A8,8 0 1 1 20,17" />
      <path d="M12,15 L16.5,9" />
      <circle cx={12} cy={15} r={1.6} />
    </>,
  ),
  // trois têtes : le groupe
  social: svg(
    <>
      <circle cx={12} cy={8} r={3} />
      <circle cx={5.5} cy={10} r={2.2} />
      <circle cx={18.5} cy={10} r={2.2} />
      <path d="M6.5,20 C6.5,15.5 9,13.5 12,13.5 C15,13.5 17.5,15.5 17.5,20 M2,19 C2,16 3.5,14.5 5.5,14.5 M22,19 C22,16 20.5,14.5 18.5,14.5" />
    </>,
  ),
  // bouclier
  protection: svg(<path d="M12,3 L19,6 V11.5 C19,16 16,19.5 12,21 C8,19.5 5,16 5,11.5 V6 Z M9,12 L11.2,14.2 L15.5,9.8" />),
  // ampoule
  savais: svg(
    <>
      <path d="M9,17 H15 M10,20.5 H14 M9,17 C9,14.5 6.5,13 6.5,9.5 A5.5,5.5 0 0 1 17.5,9.5 C17.5,13 15,14.5 15,17" />
    </>,
  ),
};

const SOLEIL = (
  <>
    <circle cx={12} cy={12} r={4} />
    <path d="M12,2.5 V5 M12,19 V21.5 M2.5,12 H5 M19,12 H21.5 M5.3,5.3 L7,7 M17,17 L18.7,18.7 M5.3,18.7 L7,17 M17,7 L18.7,5.3" />
  </>
);
const LUNE = <path d="M19.5,14.5 A8,8 0 1 1 9.5,4.5 A6.5,6.5 0 0 0 19.5,14.5 Z" />;

function rythmeIcon(rythme: Rythme) {
  if (rythme === 'jour') return svg(SOLEIL);
  if (rythme === 'nuit') return svg(LUNE);
  if (rythme === 'crepuscule')
    // soleil à moitié couché sur l'horizon
    return svg(<path d="M3,17 H21 M7,17 A5,5 0 0 1 17,17 M12,6.5 V9 M5.5,9.5 L7.2,11.2 M18.5,9.5 L16.8,11.2 M6,21 H18" />);
  // jour et nuit : un astre moitié soleil (rayons à gauche), moitié nuit (côté droit plein)
  return svg(
    <>
      <circle cx={13} cy={12} r={5} />
      <path d="M13,7 A5,5 0 0 1 13,17 Z" fill="currentColor" />
      <path d="M13,3 V5 M13,19 V21 M4,12 H6 M6.6,5.6 L8,7 M6.6,18.4 L8,17" />
    </>,
  );
}

/** Œuf pour les animaux qui pondent, sinon une mère et son petit. */
function petitsIcon(petits: string) {
  if (/ponte|œuf|pond/i.test(petits)) return svg(<path d="M12,3 C8,3 5.5,9 5.5,13.5 A6.5,6.5 0 0 0 18.5,13.5 C18.5,9 16,3 12,3 Z" />);
  return svg(
    <>
      <circle cx={8.5} cy={7} r={3} />
      <path d="M3.5,20 C3.5,14.5 5.5,12 8.5,12 C11.5,12 13.5,14.5 13.5,20" />
      <circle cx={17} cy={12.5} r={2.2} />
      <path d="M13.8,20 C13.8,17 15.2,15.8 17,15.8 C18.8,15.8 20.2,17 20.2,20" />
    </>,
  );
}

/** Libellé court sous chaque icône, et titre du panneau. */
const LABELS: Record<Topic, string> = {
  menu: 'Menu',
  vitesse: 'Vitesse',
  rythme: 'Jour/nuit',
  social: 'Groupe',
  petits: 'Petits',
  protection: 'Statut',
  savais: 'Anecdote',
};

const TITLES: Record<Topic, string> = {
  menu: 'Au menu',
  vitesse: 'Vitesse de pointe',
  rythme: 'Plutôt du jour ou de la nuit ?',
  social: 'Vie de groupe',
  petits: 'Les petits',
  protection: 'Statut de l’espèce',
  savais: 'Le savais-tu ?',
};

/** Comparaison avec Usain Bolt, l'humain le plus rapide. */
function versBolt(kmh: number): string {
  const ratio = kmh / BOLT_KMH;
  if (ratio >= 1.95) return `${(Math.round(ratio * 10) / 10).toLocaleString('fr-FR')} fois plus rapide qu’Usain Bolt`;
  if (ratio > 1.05) return 'Plus rapide qu’Usain Bolt';
  if (ratio >= 0.95) return 'Aussi rapide qu’Usain Bolt';
  return 'Moins rapide qu’Usain Bolt';
}

function Vitesse({ kmh, note, name }: NonNullable<Encyclo['vitesse']> & { name: string }) {
  const max = Math.max(kmh, BOLT_KMH);
  return (
    <div className="encyclo__speed">
      <p className="encyclo__big">
        {kmh.toLocaleString('fr-FR')} <small>km/h</small>
      </p>
      {note && <p className="muted small">{note.charAt(0).toUpperCase() + note.slice(1)}</p>}
      <div className="encyclo__bars" role="img" aria-label={`${kmh} km/h, contre ${BOLT_KMH} km/h pour Usain Bolt`}>
        <span className="encyclo__barlabel">{name}</span>
        <span className="encyclo__track">
          <span className="encyclo__bar encyclo__bar--animal" style={{ width: `${(kmh / max) * 100}%` }} />
        </span>
        <span className="encyclo__barlabel">Usain Bolt</span>
        <span className="encyclo__track">
          <span className="encyclo__bar encyclo__bar--bolt" style={{ width: `${(BOLT_KMH / max) * 100}%` }} />
        </span>
      </div>
      <p className="small">
        <b>{versBolt(kmh)}</b> <span className="muted">(le sprinteur le plus rapide du monde, environ {BOLT_KMH} km/h en pointe)</span>
      </p>
    </div>
  );
}

function Protection({ uicn, menaces, note }: Pick<Encyclo, 'uicn' | 'menaces' | 'note'>) {
  const onScale = UICN_ECHELLE.includes(uicn);
  return (
    <div className="encyclo__uicn">
      <p className={`encyclo__status encyclo__status--${uicn.toLowerCase()}`}>
        <b>{UICN[uicn].label}</b>
        {onScale && <span className="muted small"> · Liste rouge de l’UICN</span>}
      </p>
      <ol className={`uicn-scale${onScale ? '' : ' is-off'}`} aria-label="Échelle de la Liste rouge, de la moins à la plus grave">
        {UICN_ECHELLE.map((code) => (
          <li key={code} className={`uicn-scale__step uicn-scale__step--${code.toLowerCase()}${code === uicn ? ' is-current' : ''}`} title={UICN[code].label}>
            {code}
          </li>
        ))}
      </ol>
      {note && <p className="muted small">{note}</p>}
      {menaces && (
        <p className="small">
          <b>{uicn === 'EX' || uicn === 'EW' ? 'Pourquoi l’espèce a disparu : ' : 'Menaces : '}</b>
          {menaces}
        </p>
      )}
    </div>
  );
}

function Panel({ topic, e, name }: { topic: Topic; e: Encyclo; name: string }) {
  switch (topic) {
    case 'menu':
      return (
        <>
          <p className="encyclo__tag">{REGIMES[e.regime]}</p>
          <p>{phrase(e.menu)}</p>
        </>
      );
    case 'vitesse':
      return e.vitesse ? <Vitesse {...e.vitesse} name={name} /> : null;
    case 'rythme':
      return <p className="encyclo__tag">{RYTHMES[e.rythme]}</p>;
    case 'social':
      return <p>{phrase(e.social)}</p>;
    case 'petits':
      return <p>{phrase(e.petits)}</p>;
    case 'protection':
      return <Protection uicn={e.uicn} menaces={e.menaces} note={e.note} />;
    case 'savais':
      return <p>{e.savais}</p>;
  }
}

/** Couleur du statut, reprise sur l'icône du bouclier. */
const statusClass = (uicn: Uicn) => `encyclo__icon--${uicn.toLowerCase()}`;

export function Encyclopedie({ athleteId, name }: { athleteId: string; name: string }) {
  const e = encyclopedieOf(athleteId);
  const [open, setOpen] = useState<Topic | null>(null);
  // une autre carte : on referme
  useEffect(() => setOpen(null), [athleteId]);
  if (!e) return null;

  const topics: Topic[] = ['menu', ...(e.vitesse ? (['vitesse'] as const) : []), 'rythme', 'social', 'petits', 'protection', 'savais'];
  const icon = (topic: Topic) => (topic === 'rythme' ? rythmeIcon(e.rythme) : topic === 'petits' ? petitsIcon(e.petits) : ICONS[topic]);

  return (
    <section className="encyclo" aria-label="En savoir plus sur cette espèce">
      <p className="box-label">En savoir plus</p>
      <div className="encyclo__icons" role="tablist" style={{ ['--n' as string]: topics.length }}>
        {topics.map((topic) => (
          <button
            key={topic}
            type="button"
            role="tab"
            id={`encyclo-tab-${topic}`}
            aria-selected={open === topic}
            aria-controls="encyclo-panel"
            className={`encyclo__icon${open === topic ? ' is-open' : ''}${topic === 'protection' ? ` ${statusClass(e.uicn)}` : ''}`}
            onClick={() => setOpen((current) => (current === topic ? null : topic))}
          >
            <span className="encyclo__glyph">{icon(topic)}</span>
            <span className="encyclo__label">{LABELS[topic]}</span>
          </button>
        ))}
      </div>
      {open ? (
        <div key={open} id="encyclo-panel" className="encyclo__panel" role="tabpanel" aria-labelledby={`encyclo-tab-${open}`}>
          <p className="encyclo__title">{TITLES[open]}</p>
          <Panel topic={open} e={e} name={name} />
        </div>
      ) : (
        <p className="encyclo__hint muted small">Touche une icône pour découvrir comment vit cet animal.</p>
      )}
    </section>
  );
}
