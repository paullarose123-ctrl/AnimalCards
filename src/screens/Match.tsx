import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { ATHLETES_BY_ID } from '../data/athletes';
import { EVENTS, EVENT_ORDER, SPORTS, SPORT_ORDER, STAT_LABELS } from '../data/sports';
import { displayName, formatRecord, isMythe, overallOf, ultiOf } from '../engine/cards';
import { MAX_ENERGY, ROUNDS, TEAM_SIZE, divisionTarget, estimatePower, matchResult, rewardFor, teamRating, teamSynergies, type MatchState, type RoundLog } from '../engine/match';
import type { OwnedCard } from '../engine/types';
import { Card } from '../components/Card';
import { Balles } from '../components/Balles';
import { SportIcon } from '../components/SportIcon';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { sfx } from '../audio/sfx';

function eventFormula(eventId: MatchState['events'][number]): string {
  const event = EVENTS[eventId];
  if (event.blend) return `Moyenne ${event.blend.map((k) => STAT_LABELS[k].short).join(' · ')}`;
  if (event.popularity) return 'Aura 50 % · Popularité 50 %';
  return `${STAT_LABELS[event.primary].name} 70 % · ${STAT_LABELS[event.secondary].name} 30 %`;
}

function Picker({ onPick, onClose, exclude, mythes = false }: { onPick: (uid: string) => void; onClose: () => void; exclude: string[]; mythes?: boolean }) {
  const collection = useGame((s) => s.collection);
  const [query, setQuery] = useState('');
  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    return collection
      .filter((c) => !exclude.includes(c.uid))
      // animaux dans les 5 places, cartes Mythe dans leur emplacement à part
      .filter((c) => isMythe(ATHLETES_BY_ID[c.athleteId]) === mythes)
      .filter((c) => !q || displayName(ATHLETES_BY_ID[c.athleteId]).toLowerCase().includes(q))
      .sort((a, b) => overallOf(ATHLETES_BY_ID[b.athleteId], b.variant) - overallOf(ATHLETES_BY_ID[a.athleteId], a.variant))
      .slice(0, 80);
  }, [collection, exclude, query, mythes]);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={onClose}>
      <div className="modal__panel picker" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2 id="picker-title">{mythes ? 'Choisir une carte Mythe' : 'Choisir un animal'}</h2>
        <label className="field">
          <span className="visually-hidden">Rechercher</span>
          <input id="picker-search" type="search" placeholder="Rechercher dans ta réserve" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </label>
        {cards.length === 0 ? (
          <p className="muted">
            {mythes
              ? 'Aucune carte Mythe pour l’instant. Elles sortent rarement des boosters : dragons, griffons, phénix et autres créatures fantastiques.'
              : 'Aucune carte disponible. Ouvre des boosters pour agrandir ta réserve.'}
          </p>
        ) : (
          <div className="card-grid">
            {cards.map((card) => (
              <Card key={card.uid} card={card} size="sm" onClick={() => onPick(card.uid)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamBuilder() {
  const collection = useGame((s) => s.collection);
  const team = useGame((s) => s.team);
  const setTeamSlot = useGame((s) => s.setTeamSlot);
  const autoTeam = useGame((s) => s.autoTeam);
  const startMatch = useGame((s) => s.startMatch);
  const division = useGame((s) => s.division);
  const points = useGame((s) => s.divisionPoints);
  const openDetail = useUi((s) => s.openDetail);
  const mytheUid = useGame((s) => s.mythe);
  const setMythe = useGame((s) => s.setMythe);
  const [picking, setPicking] = useState<number | null>(null);
  const [pickingMythe, setPickingMythe] = useState(false);

  const slots: Array<OwnedCard | null> = Array.from({ length: TEAM_SIZE }, (_, i) => collection.find((c) => c.uid === team[i]) ?? null);
  const filled = slots.filter((s): s is OwnedCard => !!s);
  const mytheCard = collection.find((c) => c.uid === mytheUid) ?? null;
  const mytheInfo = mytheCard ? ATHLETES_BY_ID[mytheCard.athleteId].mythe : undefined;
  const boosted = mytheInfo ? filled.filter((c) => mytheInfo.bonus.sport === 'all' || ATHLETES_BY_ID[c.athleteId].sport === mytheInfo.bonus.sport).length : 0;
  const rating = teamRating(filled);
  const target = Math.round(divisionTarget(division));

  return (
    <>
      <section className="panel division">
        <div>
          <p className="eyebrow">Ligue sauvage</p>
          <h2>Division {division}</h2>
          <p className="muted">
            Adversaires autour de {target} de moyenne. Victoire : <Balles value={rewardFor('win', division)} /> · Nul : <Balles value={rewardFor('draw', division)} />
          </p>
        </div>
        <div className="division__progress">
          <span>
            {points}/7 points pour monter {division > 1 ? `en division ${division - 1}` : '(division d’élite)'}
          </span>
          <span className="meter">
            <span className="meter__fill" style={{ width: `${(points / 7) * 100}%` }} />
          </span>
          <span className="muted small">Victoire +3, nul +1</span>
        </div>
      </section>

      <section className="panel">
        <div className="summary__head">
          <h2>
            Mon équipe <small className="muted">note moyenne {rating || '—'}</small>
          </h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={autoTeam} disabled={!collection.length}>
            Équipe auto
          </button>
        </div>
        <div className="team-slots">
          {slots.map((card, i) => (
            <div key={i} className="team-slot">
              {card ? (
                <>
                  <Card card={card} size="sm" onClick={() => openDetail({ card })} />
                  <div className="team-slot__actions">
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => setPicking(i)}>
                      Changer
                    </button>
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => setTeamSlot(i, null)} aria-label={`Retirer ${ATHLETES_BY_ID[card.athleteId].last}`}>
                      ×
                    </button>
                  </div>
                </>
              ) : (
                <button type="button" className="team-slot__empty" onClick={() => setPicking(i)}>
                  <span>+</span>
                  Choisir
                </button>
              )}
            </div>
          ))}
        </div>
        {/* emplacement Mythe : une créature fantastique qui booste sa famille */}
        <div className="mythe-slot">
          <div className="mythe-slot__card">
            {mytheCard ? (
              <Card card={mytheCard} size="sm" onClick={() => openDetail({ card: mytheCard })} />
            ) : (
              <button type="button" className="team-slot__empty" onClick={() => setPickingMythe(true)}>
                <span>★</span>
                Mythe
              </button>
            )}
          </div>
          <div className="mythe-slot__text">
            <p className="eyebrow">Carte Mythe</p>
            {mytheCard && mytheInfo ? (
              <p>
                <b>{ATHLETES_BY_ID[mytheCard.athleteId].last}</b> : +{mytheInfo.bonus.value}{' '}
                {mytheInfo.bonus.sport === 'all' ? 'pour tous les animaux' : `pour ${SPORTS[mytheInfo.bonus.sport].group}`}
                {mytheInfo.bonus.events?.length
                  ? `, +${mytheInfo.bonus.eventBonus} de plus en ${mytheInfo.bonus.events.map((e) => EVENTS[e].name).join(', ')}`
                  : ''}
                . <span className="muted">{boosted ? `${boosted} anima${boosted > 1 ? 'ux' : 'l'} en profite${boosted > 1 ? 'nt' : ''}.` : 'Aucun animal de ton équipe n’en profite.'}</span>
              </p>
            ) : (
              <p className="muted">Ajoute une créature fantastique : la carte donne un bonus à tous les animaux de sa famille.</p>
            )}
            <div className="team-slot__actions">
              <button type="button" className="btn btn--ghost btn--xs" onClick={() => setPickingMythe(true)}>
                {mytheCard ? 'Changer' : 'Choisir'}
              </button>
              {mytheCard && (
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setMythe(null)} aria-label="Retirer la carte Mythe">
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        {filled.length > 0 && (
          <ul className="synergies">
            {teamSynergies(filled).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={filled.length < TEAM_SIZE}
          onClick={() => {
            sfx.whoosh();
            startMatch();
          }}
        >
          {filled.length < TEAM_SIZE ? `Choisis ${TEAM_SIZE - filled.length} anima${TEAM_SIZE - filled.length > 1 ? 'ux' : 'l'} de plus` : 'Lancer le match'}
        </button>
      </section>

      <details className="panel rules">
        <summary>
          <h2>Règles du match et particularités des familles</h2>
        </summary>
        <p>
          Un match se joue en {ROUNDS} manches. Chaque manche est une épreuve tirée au sort. Tu choisis quel animal envoyer, sans savoir qui l’adversaire aligne. Chaque animal ne joue qu’une fois.
          Tu commences avec 2 points d’énergie (⚡), 3 avec un primate dans l’équipe : un ulti en coûte un, et chaque manche perdue en rend un (3 maximum).
        </p>
        <ul className="rules__events">
          {EVENT_ORDER.map((id) => (
            <li key={id}>
              <b>{EVENTS[id].name}</b> : {eventFormula(id)}
            </li>
          ))}
        </ul>
        <ul className="rules__sports">
          {SPORT_ORDER.map((id) => (
            <li key={id}>
              <SportIcon sport={id} />
              <span>
                <b>
                  {SPORTS[id].name} · {SPORTS[id].passive.name}
                </b>{' '}
                {SPORTS[id].passive.desc}
              </span>
            </li>
          ))}
        </ul>
      </details>

      {picking !== null && (
        <Picker
          exclude={team.filter((uid, i) => i !== picking && uid)}
          onClose={() => setPicking(null)}
          onPick={(uid) => {
            setTeamSlot(picking, uid);
            setPicking(null);
          }}
        />
      )}
      {pickingMythe && (
        <Picker
          mythes
          exclude={[]}
          onClose={() => setPickingMythe(false)}
          onPick={(uid) => {
            setMythe(uid);
            setPickingMythe(false);
          }}
        />
      )}
    </>
  );
}

function Energy({ value, label }: { value: number; label: string }) {
  return (
    <span className="energy" aria-label={`${label} : ${value} énergie sur ${MAX_ENERGY}`}>
      {Array.from({ length: MAX_ENERGY }, (_, i) => (
        <i key={i} className={i < value ? 'is-on' : ''} aria-hidden="true">
          ⚡
        </i>
      ))}
    </span>
  );
}

function CountUp({ value, run }: { value: number; run: boolean }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!run) return;
    let frame = 0;
    const start = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - start) / 900);
      setShown(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, run]);
  return <>{Math.round(shown)}</>;
}

function UltiSplash({ match, log }: { match: MatchState; log: RoundLog }) {
  const mine = log.me.ulti && !log.me.cancelled;
  const theirs = log.opp.ulti && !log.opp.cancelled;
  const side = mine ? 'me' : theirs ? 'opp' : null;
  if (!side) return null;
  const card = side === 'me' ? match.me.cards[log.me.index] : match.opp.cards[log.opp.index];
  const athlete = ATHLETES_BY_ID[card.athleteId];
  const ulti = ultiOf(athlete, card.variant);
  const record = side === 'me' && log.records.length && card.record ? card.record : null;
  return (
    <div className="ulti-splash" style={{ ['--splash' as string]: side === 'me' ? SPORTS[athlete.sport].color : '#e8866b' }} aria-hidden="true">
      <span className="ulti-splash__label">{side === 'me' ? 'Ulti' : 'Ulti adverse'}</span>
      <p className="ulti-splash__name">{ulti.name}</p>
      <span className="ulti-splash__sub">
        {record ? `Nouveau record : ${formatRecord(record)}` : displayName(athlete)}
      </span>
    </div>
  );
}

function RoundResolution({ match, log, onNext }: { match: MatchState; log: RoundLog; onNext: () => void }) {
  const me = match.me.cards[log.me.index];
  const opp = match.opp.cards[log.opp.index];
  useEffect(() => {
    if (log.me.ulti || log.opp.ulti) sfx.ulti();
    const id = window.setTimeout(() => {
      sfx.hit();
      if (log.winner === 'me') sfx.reveal(2);
      if (log.winner === 'opp') sfx.error();
    }, 950);
    return () => window.clearTimeout(id);
  }, [log]);

  const side = (who: 'me' | 'opp') => {
    const play = who === 'me' ? log.me : log.opp;
    const card = who === 'me' ? me : opp;
    const ulti = ultiOf(ATHLETES_BY_ID[card.athleteId], card.variant);
    return (
      <div className={`clash__side clash__side--${who}${log.winner === who ? ' is-winner' : ''}`}>
        <p className="clash__team">{who === 'me' ? match.me.name : match.opp.name}</p>
        <Card card={card} size="md" />
        {play.ulti && (
          <p className={`clash__ulti${play.cancelled ? ' is-cancelled' : ''}`}>
            {play.cancelled ? 'Ulti contré' : `ULTI · ${ulti.name}`}
          </p>
        )}
        <p className="clash__power">
          <CountUp value={play.power} run />
        </p>
        <ul className="clash__parts">
          {play.parts.map((part, i) => (
            <li key={i}>
              <span>{part.label}</span>
              <b>
                {part.value >= 0 ? '+' : ''}
                {Math.round(part.value)}
              </b>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className={`clash clash--${log.winner}`}>
      <UltiSplash match={match} log={log} />
      <p className="clash__event">
        Manche {log.round + 1} · {EVENTS[log.event].name}
      </p>
      <div className="clash__arena">
        {side('me')}
        <span className="clash__vs" aria-hidden="true">
          VS
        </span>
        {side('opp')}
      </div>
      <p className="clash__verdict" role="status">
        {log.winner === 'me' ? `Manche gagnée${log.points > 1 ? ' : elle compte double !' : ''}` : log.winner === 'opp' ? `Manche perdue${log.points > 1 ? ' (compte double)' : ''}` : 'Égalité parfaite'}
        {log.records.length > 0 && ' · Nouveau record : +1 km/h !'}
      </p>
      <button type="button" className="btn btn--primary btn--lg" onClick={onNext}>
        {match.finished ? 'Voir le résultat' : 'Manche suivante'}
      </button>
    </div>
  );
}

function MatchView({ match }: { match: MatchState }) {
  const play = useGame((s) => s.playMatchRound);
  const finish = useGame((s) => s.finishMatch);
  const abandon = useGame((s) => s.abandonMatch);
  const [selected, setSelected] = useState<number | null>(null);
  const [useUlti, setUseUlti] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const eventId = match.events[match.round];
  const event = eventId ? EVENTS[eventId] : null;

  if (match.finished && !revealing) {
    const result = matchResult(match);
    return (
      <section className={`panel final final--${result}`}>
        <p className="eyebrow">Fin du match · Division {match.division}</p>
        <h1>{result === 'win' ? 'Victoire !' : result === 'draw' ? 'Match nul' : 'Défaite'}</h1>
        <p className="final__score">
          {match.me.name} {match.me.score} – {match.opp.score} {match.opp.name}
        </p>
        <ol className="final__rounds">
          {match.log.map((log) => (
            <li key={log.round} className={`is-${log.winner}`}>
              <span>{EVENTS[log.event].name}</span>
              <span>
                {ATHLETES_BY_ID[match.me.cards[log.me.index].athleteId].last} {Math.round(log.me.power)} – {Math.round(log.opp.power)}{' '}
                {ATHLETES_BY_ID[match.opp.cards[log.opp.index].athleteId].last}
              </span>
            </li>
          ))}
        </ol>
        <p>
          Récompense : <Balles value={rewardFor(result, match.division)} />
        </p>
        <button type="button" className="btn btn--primary btn--xl" onClick={finish}>
          Encaisser et continuer
        </button>
      </section>
    );
  }

  const lastLog = match.log[match.log.length - 1];
  if (revealing && lastLog) {
    return (
      <RoundResolution
        match={match}
        log={lastLog}
        onNext={() => {
          setRevealing(false);
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }

  const selectedCard = selected !== null ? match.me.cards[selected] : null;
  const selectedUlti = selectedCard ? ultiOf(ATHLETES_BY_ID[selectedCard.athleteId], selectedCard.variant) : null;

  return (
    <div className="match">
      <section className="scoreboard" aria-label="Score">
        <div className="scoreboard__team">
          <span>{match.me.name}</span>
          <Energy value={match.me.energy} label="Ton énergie" />
        </div>
        <div className="scoreboard__score">
          <b>{match.me.score}</b>
          <span>–</span>
          <b>{match.opp.score}</b>
        </div>
        <div className="scoreboard__team scoreboard__team--opp">
          <span>{match.opp.name}</span>
          <Energy value={match.opp.energy} label="Énergie adverse" />
        </div>
        <ol className="scoreboard__rounds" aria-label="Manches">
          {match.events.map((id, i) => (
            <li key={i} className={i < match.round ? `is-${match.log[i].winner}` : i === match.round ? 'is-current' : ''}>
              {EVENTS[id].name}
            </li>
          ))}
        </ol>
      </section>

      {event && (
        <section className="event-banner">
          <p className="eyebrow">
            Manche {match.round + 1} sur {ROUNDS}
          </p>
          <h2>{event.name}</h2>
          <p>
            {event.desc} <span className="muted">({eventFormula(event.id)})</span>
          </p>
        </section>
      )}

      <section className="panel">
        <h3 className="panel__title">L’équipe adverse</h3>
        <div className="card-row card-row--tight">
          {match.opp.cards.map((card, i) => (
            <div key={card.uid} className={`opp-card${match.opp.used.includes(i) ? ' is-used' : ''}`}>
              <Card card={card} size="xs" />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title">Choisis ton animal pour « {event?.name} »</h3>
        <div className="hand">
          {match.me.cards.map((card, i) => {
            const used = match.me.used.includes(i);
            const estimate = used ? 0 : Math.round(estimatePower(match, i, false));
            return (
              <button
                key={card.uid}
                type="button"
                className={`hand__card${used ? ' is-used' : ''}${selected === i ? ' is-selected' : ''}`}
                disabled={used}
                onClick={() => {
                  sfx.click();
                  setSelected(i);
                }}
                aria-pressed={selected === i}
                aria-label={`${ATHLETES_BY_ID[card.athleteId].last}, puissance estimée ${estimate}`}
              >
                <Card card={card} size="sm" />
                {!used && <span className="hand__estimate">≈ {estimate}</span>}
              </button>
            );
          })}
        </div>
        {selectedCard && selectedUlti && (
          <div className={`ulti-toggle${useUlti ? ' is-on' : ''}`}>
            <label className="toggle">
              <input id="use-ulti" type="checkbox" checked={useUlti} disabled={match.me.energy <= 0} onChange={(e) => setUseUlti(e.target.checked)} />
              <span>
                Activer l’ulti <b>{selectedUlti.name}</b> (1 ⚡)
              </span>
            </label>
            <p className="muted small">
              {selectedUlti.desc} {useUlti && <>Puissance estimée avec l’ulti : ≈ {Math.round(estimatePower(match, selected!, true))}</>}
            </p>
            {match.me.energy <= 0 && <p className="muted small">Plus d’énergie : perds une manche pour en regagner.</p>}
          </div>
        )}
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return;
              play(selected, useUlti);
              setSelected(null);
              setUseUlti(false);
              setRevealing(true);
              window.scrollTo({ top: 0 });
            }}
          >
            Jouer la manche
          </button>
          {!confirmAbandon ? (
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmAbandon(true)}>
              Abandonner
            </button>
          ) : (
            <button type="button" className="btn btn--danger" onClick={abandon}>
              Confirmer l’abandon (aucune récompense)
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function MatchScreen() {
  const match = useGame((s) => s.match);
  return (
    <div className="screen">
      <header className="screen__head screen__head--art">
        <Landscape className="screen__art" scene={SCREEN_SCENES.matchs} seed="arène" />
        <div>
          <p className="eyebrow">Arène</p>
          <h1>{match ? `${match.me.name} contre ${match.opp.name}` : 'Composer mon équipe'}</h1>
          {!match && <p className="muted">5 animaux, 5 épreuves. Les stats, les particularités des familles et les ultis décident du vainqueur.</p>}
        </div>
      </header>
      {match ? <MatchView key={match.id} match={match} /> : <TeamBuilder />}
    </div>
  );
}
