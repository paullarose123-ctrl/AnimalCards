import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useGame, formatBalles } from '../store/game';
import { useUi } from '../store/ui';
import { ATHLETES_BY_ID } from '../data/athletes';
import { SPORTS } from '../data/sports';
import { isIcon, overallOf, quickSellValue, rarityOf } from '../engine/cards';
import type { CardFace } from '../engine/types';
import { Card } from '../components/Card';
import { ALL_PACK_SCENES, PackArt, packScene } from '../components/PackArt';
import { CardBack } from '../components/CardBack';
import { Landscape, type SceneDef } from '../components/PackScene';
import { HERO_SCENE, SCREEN_SCENES } from '../art/scenes';
import { Logo } from '../components/Logo';
import { Flag, countryName } from '../components/Flag';
import { CardStats } from '../components/CardStats';
import { SportIcon } from '../components/SportIcon';
import { Confetti, type ConfettiHandle } from '../components/Confetti';
import { sfx } from '../audio/sfx';
import { usePhoto } from '../photos';

// pack : le sachet attend ; charging : il se charge et tremble ; tearing : il se déchire et les cartes sortent
type Stage = 'pack' | 'charging' | 'tearing' | 'cards' | 'walkout' | 'summary';

/** Paysages possibles derrière une ouverture : tous ceux des boosters, des familles et des écrans. */
const BACKDROPS: SceneDef[] = [...ALL_PACK_SCENES, HERO_SCENE, ...Object.values(SCREEN_SCENES)];
let lastBackdrop = -1;

/** Un paysage au hasard (jamais deux fois de suite le même), redessiné avec une graine neuve. */
function pickBackdrop(): { scene: SceneDef; seed: string } {
  let i = Math.floor(Math.random() * BACKDROPS.length);
  if (i === lastBackdrop) i = (i + 1 + Math.floor(Math.random() * (BACKDROPS.length - 1))) % BACKDROPS.length;
  lastBackdrop = i;
  return { scene: BACKDROPS[i], seed: `ouverture ${Math.random().toString(36).slice(2)}` };
}

// Éclats projetés par la déchirure : papier crème, feuilles aux couleurs du paysage, étincelles de la rareté.
const BITS = Array.from({ length: 18 }, (_, i) => ({
  x: 6 + ((i * 53) % 88),
  dx: (i % 2 ? 1 : -1) * (24 + ((i * 29) % 110)),
  dy: -(70 + ((i * 41) % 130)),
  r: ((i * 73) % 300) - 150,
  d: (i % 6) * 0.025,
  s: 7 + (i % 4) * 3,
}));

// Déchirure en dents de scie à 11,5 % du haut : le corps et la bande partagent le même tracé.
const TEAR_POINTS = Array.from({ length: 21 }, (_, i) => `${i * 5}% ${(11.5 + (i % 2 ? 0.9 : -0.6) * (i % 3 ? 1 : 0.6)).toFixed(2)}%`);
const BODY_CLIP = `polygon(${TEAR_POINTS.join(', ')}, 100% 100%, 0% 100%)`;
const STRIP_CLIP = `polygon(0% 0%, 100% 0%, ${TEAR_POINTS.slice().reverse().join(', ')})`;

// lueur de chaque palier, aux couleurs de sa palette de booster
const RARITY_GLOW: Record<string, string> = {
  commune: '#8fdcc5',
  'peu-commune': '#9ccbf5',
  rare: '#ffb257',
  epique: '#a98bff',
  legendaire: '#ff9a6a',
};

function tierOf(card: CardFace): number {
  return rarityOf(ATHLETES_BY_ID[card.athleteId]).order;
}

function isSpecial(card: CardFace): boolean {
  // les Mythes n'ont pas de révélation « animal » (drapeau, note) : ils se retournent sur place
  if (ATHLETES_BY_ID[card.athleteId].mythe) return false;
  return tierOf(card) >= 3 || card.variant === 'prime';
}

function glowOf(card: CardFace): string {
  if (card.variant === 'prime') return '#f2b8cf';
  if (card.variant === 'reverse') return '#e3c6ff';
  if (ATHLETES_BY_ID[card.athleteId].mythe) return '#e0b85a';
  return RARITY_GLOW[rarityOf(ATHLETES_BY_ID[card.athleteId]).id];
}

function confettiColors(card: CardFace): string[] {
  if (card.variant === 'prime') return ['#f2b8cf', '#f6dc95', '#a8e6d4', '#a0cdd7', '#c9aee8', '#ffffff'];
  if (tierOf(card) === 4) return ['#ffd76a', '#fff3c4', '#e0a93a', '#ffffff', '#f2b8cf', '#a0cdd7'];
  return ['#b994ee', '#e3d2ff', '#f0cf6a', '#a9cf7e', '#ffffff'];
}

// Particules de lumière qui flottent dans la scène (positions fixes, pour un rendu stable).
const DUST = Array.from({ length: 16 }, (_, i) => ({
  x: (i * 37 + 11) % 100,
  delay: -((i * 1.7) % 9),
  dur: 9 + ((i * 2.3) % 7),
  size: 2 + (i % 3),
}));

/** Inclinaison 3D qui suit le pointeur : pilote --tx / --ty sur l'élément .tilt3d du conteneur. */
function tilt3d(event: PointerEvent<HTMLElement>) {
  // à la souris seulement : au doigt, l'inclinaison resterait figée après chaque toucher
  if (event.pointerType !== 'mouse') return;
  const el = event.currentTarget.querySelector<HTMLElement>('.tilt3d');
  if (!el) return;
  const rect = event.currentTarget.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  el.style.setProperty('--tx', `${(-y * 18).toFixed(2)}deg`);
  el.style.setProperty('--ty', `${(x * 26).toFixed(2)}deg`);
  // le reflet du plastique glisse avec l'inclinaison
  el.style.setProperty('--gloss-x', `${(40 + x * 60).toFixed(1)}%`);
}

function untilt3d(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget.querySelector<HTMLElement>('.tilt3d');
  el?.style.setProperty('--tx', '0deg');
  el?.style.setProperty('--ty', '0deg');
  el?.style.removeProperty('--gloss-x');
}

/** Étiquette sous une carte révélée : Reverse, sinon Nouveau ou Doublon. */
function CardTag({ card }: { card: CardFace & { isNew?: boolean } }) {
  if (ATHLETES_BY_ID[card.athleteId].mythe) return <span className="tag tag--mythe">{card.isNew ? 'Nouveau mythe' : 'Mythe'}</span>;
  if (card.variant === 'reverse') return <span className="tag tag--reverse">Reverse</span>;
  return <span className={`tag ${card.isNew ? 'tag--new' : 'tag--dupe'}`}>{card.isNew ? 'Nouveau' : 'Doublon'}</span>;
}

function Walkout({ card, onDone }: { card: CardFace; onDone: () => void }) {
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const rarity = rarityOf(athlete);
  const [step, setStep] = useState(0);
  const confetti = useRef<ConfettiHandle>(null);
  const prime = card.variant === 'prime';
  const title = prime ? 'PRIME' : rarity.name.toUpperCase();
  const photo = usePhoto(athlete);
  const silhouette = photo.src && photo.cutout ? photo.src : null;
  // étapes : 0 drapeau, 1 famille, 2 note, (2.5 silhouette si photo détourée), 3 carte
  const [shadow, setShadow] = useState(false);

  useEffect(() => {
    if (step >= 3) return;
    if (step === 0) sfx.drumroll(silhouette ? 3.6 : 2.6);
    const id = window.setTimeout(
      () => {
        if (step === 2 && silhouette && !shadow) {
          setShadow(true);
          return;
        }
        setStep((s) => s + 1);
      },
      step === 0 ? 1100 : 950,
    );
    return () => window.clearTimeout(id);
  }, [step, silhouette, shadow]);

  useEffect(() => {
    if (!shadow) return;
    sfx.burst();
    const id = window.setTimeout(() => setStep(3), 1100);
    return () => window.clearTimeout(id);
  }, [shadow]);

  useEffect(() => {
    if (step === 3) {
      sfx.fanfare();
      confetti.current?.burst(confettiColors(card), rarity.order === 4 || prime ? 70 : 40);
    } else if (step > 0) {
      sfx.pulse();
    }
  }, [step, card, prime, rarity.order]);

  const skip = useCallback(() => {
    if (step < 3) setStep(3);
    else onDone();
  }, [step, onDone]);

  return (
    <div
      className={`walkout walkout--${prime ? 'prime' : rarity.id} walkout--step-${step}`}
      style={{ ['--beam' as string]: glowOf(card) }}
      role="dialog"
      aria-modal="true"
      aria-label={`Révélation ${title}`}
      onClick={skip}
    >
      {/* le paysage de la famille apparaît quand la famille est dévoilée */}
      <Landscape className="walkout__scene" scene={packScene('sport', athlete.sport)} seed={`Pack ${SPORTS[athlete.sport].name}`} />
      <div className="walkout__beams" aria-hidden="true" />
      <div className="walkout__floor" aria-hidden="true" />
      {step < 3 && (
        <div className="walkout__clue" key={`${step}-${shadow}`}>
          {step === 0 && (
            <>
              <Flag code={athlete.country} className="walkout__flag" />
              <span className="walkout__label">{countryName(athlete.country)}</span>
            </>
          )}
          {step === 1 && (
            <>
              <SportIcon sport={athlete.sport} className="walkout__sport" />
              <span className="walkout__label">{SPORTS[athlete.sport].name}</span>
            </>
          )}
          {step === 2 && !shadow && (
            <>
              <span className="walkout__ovr">{overallOf(athlete, card.variant)}</span>
              <span className="walkout__label">{isIcon(athlete) ? 'Icône' : athlete.role}</span>
            </>
          )}
          {step === 2 && shadow && silhouette && <img className="walkout__silhouette" src={silhouette} alt="" />}
        </div>
      )}
      {step === 3 && (
        <div className="walkout__reveal">
          <p className="walkout__title" data-text={title}>
            {title}
          </p>
          <div className="walkout__body">
            <Card card={card} size="xl" tilt className="walkout__card" />
            {/* lire la fiche ne ferme pas la révélation */}
            <div className="walkout__stats" onClick={(event) => event.stopPropagation()}>
              <CardStats card={card} />
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={onDone}>
            Continuer
          </button>
        </div>
      )}
      {step < 3 && (
        <button
          type="button"
          className="walkout__skip"
          onClick={(event) => {
            event.stopPropagation();
            setStep(3);
          }}
        >
          Passer
        </button>
      )}
      <Confetti ref={confetti} />
    </div>
  );
}

export function PackOpening() {
  const opening = useGame((s) => s.opening);
  const close = useGame((s) => s.closeOpening);
  const quickSell = useGame((s) => s.quickSell);
  const freePacks = useGame((s) => s.freePacks);
  const openFreePack = useGame((s) => s.openFreePack);
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const [stage, setStage] = useState<Stage>('pack');
  const [revealed, setRevealed] = useState(0);
  // carte affichée en grand (une seule à la fois) et sortie en cours vers la suivante
  const [current, setCurrent] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const [walkoutIndex, setWalkoutIndex] = useState<number | null>(null);
  const [soldDupes, setSoldDupes] = useState(false);
  // récapitulatif : carte dont la fiche express est affichée (par défaut la meilleure, la dernière)
  const [focus, setFocus] = useState<number | null>(null);
  const summaryStats = useRef<HTMLDivElement>(null);
  const confetti = useRef<ConfettiHandle>(null);

  // nouvelle ouverture : on repart du sachet fermé
  useEffect(() => {
    if (opening) {
      setStage('pack');
      setRevealed(0);
      setCurrent(0);
      setLeaving(false);
      setWalkoutIndex(null);
      setSoldDupes(false);
      setFocus(null);
    }
  }, [opening]);

  const cards = opening?.cards ?? [];
  const best = useMemo(() => cards[cards.length - 1], [cards]);
  // un fond différent à chaque ouverture
  const backdrop = useMemo(() => (opening ? pickBackdrop() : null), [opening]);

  const revealNext = useCallback(() => {
    if (!opening || revealed >= cards.length) return;
    const card = cards[revealed];
    if (isSpecial(card)) {
      setWalkoutIndex(revealed);
      setStage('walkout');
      return;
    }
    sfx.flip();
    window.setTimeout(() => sfx.reveal(tierOf(card)), 250);
    setRevealed((r) => r + 1);
  }, [opening, revealed, cards]);

  // un clic : retourne la carte affichée ; clic suivant : elle sort et la suivante entre
  const advance = useCallback(() => {
    if (stage !== 'cards' || leaving || !cards.length) return;
    if (revealed <= current) {
      revealNext();
      return;
    }
    if (current >= cards.length - 1) {
      setStage('summary');
      return;
    }
    setLeaving(true);
    sfx.deal();
    window.setTimeout(() => {
      setCurrent((c) => c + 1);
      setLeaving(false);
    }, 480);
  }, [stage, leaving, cards.length, revealed, current, revealNext]);

  const revealAll = useCallback(() => {
    // révèle tout jusqu'à la prochaine carte spéciale (qui a droit à sa mise en scène)
    let next = revealed;
    while (next < cards.length && !isSpecial(cards[next])) next += 1;
    if (next > revealed) {
      sfx.flip();
      sfx.reveal(tierOf(cards[next - 1]));
      setRevealed(next);
      setCurrent(next - 1);
    }
    if (next < cards.length) {
      window.setTimeout(
        () => {
          setCurrent(next);
          setWalkoutIndex(next);
          setStage('walkout');
        },
        next > revealed ? 600 : 0,
      );
    } else {
      window.setTimeout(() => setStage('summary'), 900);
    }
  }, [revealed, cards]);

  useEffect(() => {
    if (!opening) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && stage === 'summary' && !useUi.getState().detail) close();
      const onButton = event.target instanceof HTMLElement && event.target.closest('button');
      if (stage === 'cards' && !onButton && (event.key === ' ' || event.key === 'Enter' || event.key === 'ArrowRight')) {
        event.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [opening, stage, close, advance]);

  if (!opening) return null;

  const tear = () => {
    if (stage !== 'pack') return;
    // 1. le sachet se charge : il tremble de plus en plus, la couture s'illumine à la couleur de la meilleure carte
    // 2. la bande s'arrache en dents de scie, des éclats volent, un faisceau de lumière jaillit
    // 3. les cartes montent en éventail hors du sachet, puis le sachet s'éloigne vers le bas
    const charge = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 850;
    setStage('charging');
    if (charge) sfx.drumroll(charge / 1000);
    window.setTimeout(() => {
      sfx.tear();
      setStage('tearing');
      window.setTimeout(() => sfx.burst(), 380);
      window.setTimeout(() => sfx.deal(), 700);
      window.setTimeout(() => {
        setStage('cards');
        sfx.deal();
      }, 1600);
    }, charge);
  };

  // une Reverse n'est jamais comptée comme doublon à revendre
  const dupes = cards.filter((c) => !c.isNew && c.variant !== 'reverse');
  const ownedDupes = dupes.filter((c) => collection.some((o) => o.uid === c.uid && !o.locked));
  const dupesValue = ownedDupes.reduce((sum, c) => sum + quickSellValue(ATHLETES_BY_ID[c.athleteId], c.variant), 0);
  const isFree = opening.packName === 'Booster gratuit';
  // dos et tranches du sachet aux couleurs de son paysage
  const palette = packScene(opening.tone, opening.sport).palette;
  const focusIndex = focus ?? cards.length - 1;
  const focusCard = cards[focusIndex];
  const focusOwned = focusCard ? collection.find((c) => c.uid === focusCard.uid) : undefined;
  // intensité de la mise en scène : 0 commune → 4 légendaire, 5 Prime
  const intensity = best ? (best.variant === 'prime' ? 5 : tierOf(best)) : 0;
  const packStage = stage === 'pack' || stage === 'charging' || stage === 'tearing';

  return (
    <div className={`opening opening--${stage} opening--t${intensity}`} style={{ ['--teaser' as string]: best ? glowOf(best) : '#fff' }}>
      {/* un paysage tiré au hasard, en grand, derrière toute l'ouverture */}
      <div className="opening__backdrop" aria-hidden="true">
        {backdrop && <Landscape className="opening__scene" scene={backdrop.scene} seed={backdrop.seed} />}
      </div>
      <div className="opening__rays" aria-hidden="true" />
      <div className="opening__dust" aria-hidden="true">
        {DUST.map((d, i) => (
          <i key={i} style={{ left: `${d.x}%`, animationDelay: `${d.delay}s`, animationDuration: `${d.dur}s`, width: d.size, height: d.size }} />
        ))}
      </div>
      {packStage && (
        <div className="opening__stage" onPointerMove={tilt3d} onPointerLeave={untilt3d}>
          {/* halo derrière le sachet, onde au sol quand il atterrit */}
          <div className="opening__halo" aria-hidden="true" />
          <div className="opening__ring" aria-hidden="true" />
          <button
            type="button"
            className="opening__pack3d"
            onClick={tear}
            aria-label={`Ouvrir le ${opening.packName}`}
            style={{ ['--pack-near' as string]: palette.near, ['--pack-far' as string]: palette.far }}
          >
            {/* sachet en volume : face avant (corps + bande du haut qui s'arrache), face arrière, tranches */}
            <span className="pack3d-float">
              <span className="pack3d tilt3d">
                <span className="pack3d__cards" aria-hidden="true">
                  <CardBack />
                  <CardBack />
                  <CardBack />
                </span>
                <span className="pack3d__face pack3d__front">
                  <span className="pack3d__body" style={{ clipPath: BODY_CLIP }}>
                    <PackArt tone={opening.tone} name={opening.packName} sport={opening.sport} size={cards.length} />
                  </span>
                  <span className="pack3d__strip" aria-hidden="true" style={{ clipPath: STRIP_CLIP }}>
                    <PackArt tone={opening.tone} name={opening.packName} sport={opening.sport} size={cards.length} />
                  </span>
                  {/* couture qui s'illumine pendant la charge */}
                  <span className="pack3d__seam" aria-hidden="true" />
                </span>
                <span className="pack3d__face pack3d__back" aria-hidden="true">
                  <Logo />
                  <small>Série 1 · 2026</small>
                </span>
                <span className="pack3d__side pack3d__side--left" aria-hidden="true" />
                <span className="pack3d__side pack3d__side--right" aria-hidden="true" />
                <span className="pack3d__light" aria-hidden="true" />
                {/* faisceau qui jaillit de l'ouverture et éclats de la déchirure */}
                <span className="pack3d__beam" aria-hidden="true" />
                <span className="pack3d__bits" aria-hidden="true">
                  {BITS.map((b, i) => (
                    <i
                      key={i}
                      style={{
                        ['--x' as string]: `${b.x}%`,
                        ['--dx' as string]: `${b.dx}px`,
                        ['--dy' as string]: `${b.dy}px`,
                        ['--r' as string]: `${b.r}deg`,
                        ['--d' as string]: `${b.d}s`,
                        ['--s' as string]: `${b.s}px`,
                      }}
                    />
                  ))}
                </span>
              </span>
            </span>
          </button>
          <div className="opening__flash" aria-hidden="true" />
          <p className="opening__hint">{stage === 'pack' ? 'Touche le pack pour l’ouvrir' : ''}</p>
        </div>
      )}

      {(stage === 'cards' || stage === 'walkout') && cards[current] && (
        <div className="opening__cards opening__cards--single">
          <p className="opening__progress">
            {opening.packName} · carte {current + 1} sur {cards.length}
          </p>

          {/* une seule carte, en grand : clic pour la retourner, puis pour passer à la suivante */}
          <div className="opening__spot" onPointerMove={tilt3d} onPointerLeave={untilt3d}>
            {(() => {
              const card = cards[current];
              const flipped = revealed > current;
              return (
                <div
                  key={card.uid}
                  className={`stage-card${flipped ? ' is-flipped' : ''}${leaving ? ' is-leaving' : ''}${!flipped && isSpecial(card) ? ' is-special' : ''}`}
                  style={{ ['--glow' as string]: glowOf(card) }}
                  onClick={advance}
                  role="button"
                  tabIndex={-1}
                  aria-label={flipped ? 'Carte suivante' : 'Retourner la carte'}
                >
                  {/* inclinaison qui suit la souris, flottement lent, puis retournement en 3D */}
                  <div className="stage-card__tilt tilt3d">
                    <div className="stage-card__float">
                      <div className="flip__inner">
                        <div className="flip__back">
                          <CardBack />
                        </div>
                        <div className="flip__front">
                          <Card card={card} size="xl" />
                          {flipped && <CardTag card={card} />}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
            <div className="opening__shadow" aria-hidden="true" />
          </div>

          <p className="opening__hint opening__hint--cards">
            {revealed <= current
              ? 'Touche la carte pour la retourner'
              : current < cards.length - 1
                ? 'Touche pour la carte suivante'
                : 'Touche pour voir le récapitulatif'}
          </p>

          {/* les cartes du paquet en miniature : révélées, en cours, à venir */}
          <div className="opening__tray" aria-hidden="true">
            {cards.map((card, i) => (
              <div key={card.uid} className={`tray-slot${i === current ? ' is-current' : ''}${i < revealed ? ' is-revealed' : ''}`}>
                {i < revealed ? <Card card={card} size="xs" /> : <CardBack />}
              </div>
            ))}
          </div>

          <div className="opening__actions">
            <button type="button" className="btn btn--primary btn--lg" onClick={advance} disabled={leaving}>
              {revealed <= current ? 'Retourner' : current < cards.length - 1 ? 'Suivante' : 'Récapitulatif'}
            </button>
            <button type="button" className="btn btn--ghost" onClick={revealAll} disabled={revealed >= cards.length}>
              Tout révéler
            </button>
          </div>
          {revealed > current && (
            <div className="opening__stats">
              <CardStats card={cards[current]} />
            </div>
          )}
        </div>
      )}

      {stage === 'walkout' && walkoutIndex !== null && (
        <Walkout
          card={cards[walkoutIndex]}
          onDone={() => {
            setRevealed(walkoutIndex + 1);
            setCurrent(walkoutIndex);
            setWalkoutIndex(null);
            setStage('cards');
          }}
        />
      )}

      {stage === 'summary' && (
        <div className="opening__summary" role="dialog" aria-modal="true" aria-labelledby="summary-heading">
          <h2 id="summary-heading">{opening.packName}</h2>
          <p className="muted">
            {cards.filter((c) => c.isNew).length} nouvelle{cards.filter((c) => c.isNew).length > 1 ? 's' : ''} carte
            {cards.filter((c) => c.isNew).length > 1 ? 's' : ''} · {dupes.length} doublon{dupes.length > 1 ? 's' : ''}
          </p>
          <div className="opening__grid">
            {cards.map((card, i) => (
              <div key={card.uid} className={`opening__cell${i === focusIndex ? ' is-focus' : ''}`}>
                <Card
                  card={card}
                  size="sm"
                  onClick={() => {
                    setFocus(i);
                    // sur téléphone, la fiche est sous les cartes : on l'amène à l'écran
                    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                    requestAnimationFrame(() => summaryStats.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'nearest' }));
                  }}
                />
                <CardTag card={card} />
              </div>
            ))}
          </div>
          <div className="opening__actions">
            {ownedDupes.length > 0 && !soldDupes && (
              <button
                type="button"
                className="btn btn--gold"
                onClick={() => {
                  quickSell(ownedDupes.map((c) => c.uid));
                  setSoldDupes(true);
                }}
              >
                Vendre les doublons ({formatBalles(dupesValue)})
              </button>
            )}
            {isFree && freePacks > 0 && (
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  sfx.whoosh();
                  openFreePack();
                }}
              >
                Ouvrir le suivant ({freePacks})
              </button>
            )}
            <button type="button" className="btn btn--ghost" onClick={close}>
              Terminer
            </button>
          </div>
          {focusCard && (
            <div ref={summaryStats} className="opening__stats">
              <CardStats card={focusCard}>
                {focusOwned && (
                  <div className="card-stats__actions">
                    <button type="button" className="btn btn--ghost btn--sm" onClick={() => openDetail({ card: focusOwned })}>
                      Fiche complète
                    </button>
                  </div>
                )}
              </CardStats>
            </div>
          )}
        </div>
      )}
      <Confetti ref={confetti} />
    </div>
  );
}
