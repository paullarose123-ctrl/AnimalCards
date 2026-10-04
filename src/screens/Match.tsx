import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { ATHLETES_BY_ID } from '../data/athletes';
import { displayName } from '../engine/cards';
import {
  RECORDS,
  RECORD_ORDER,
  ROUNDS,
  TEAM_SIZE,
  canDuel,
  duelResult,
  formatRecordValue,
  rewardFor,
  type DuelRound,
  type DuelState,
} from '../engine/duel';
import type { OwnedCard } from '../engine/types';
import { Card } from '../components/Card';
import { Balles } from '../components/Balles';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { sfx } from '../audio/sfx';

// Duel de records : 5 animaux, 5 records tirés au sort. Ce sont les vraies mesures des espèces
// (poids, taille, longévité, population restante) qui décident de chaque manche.

function Picker({ onPick, onClose, exclude }: { onPick: (uid: string) => void; onClose: () => void; exclude: string[] }) {
  const collection = useGame((s) => s.collection);
  const [query, setQuery] = useState('');
  const cards = useMemo(() => {
    const q = query.trim().toLowerCase();
    const seen = new Set<string>();
    return collection
      .filter((c) => !exclude.includes(c.uid) && canDuel(ATHLETES_BY_ID[c.athleteId]))
      .filter((c) => !q || displayName(ATHLETES_BY_ID[c.athleteId]).toLowerCase().includes(q))
      .filter((c) => {
        // une seule carte par espèce dans la liste
        if (seen.has(c.athleteId)) return false;
        seen.add(c.athleteId);
        return true;
      })
      .sort((a, b) => ATHLETES_BY_ID[a.athleteId].last.localeCompare(ATHLETES_BY_ID[b.athleteId].last, 'fr'))
      .slice(0, 120);
  }, [collection, exclude, query]);
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
        <h2 id="picker-title">Choisir un animal</h2>
        <label className="field">
          <span className="visually-hidden">Rechercher</span>
          <input type="search" placeholder="Rechercher dans ta réserve" value={query} onChange={(e) => setQuery(e.target.value)} autoFocus />
        </label>
        {cards.length === 0 ? (
          <p className="muted">Aucune carte disponible. Ouvre des boosters pour agrandir ta réserve.</p>
        ) : (
          <div className="card-grid">
            {cards.map((card) => (
              <Card key={card.uid} card={card} size="sm" hideFacts onClick={() => onPick(card.uid)} />
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
  const [picking, setPicking] = useState<number | null>(null);

  const slots: Array<OwnedCard | null> = Array.from({ length: TEAM_SIZE }, (_, i) => {
    const card = collection.find((c) => c.uid === team[i]);
    return card && canDuel(ATHLETES_BY_ID[card.athleteId]) ? card : null;
  });
  const filled = slots.filter((s): s is OwnedCard => !!s);

  return (
    <>
      <section className="panel division">
        <div>
          <p className="eyebrow">Ligue des naturalistes</p>
          <h2>Division {division}</h2>
          <p className="muted">
            Plus la division est haute, mieux tes adversaires connaissent leurs animaux. Victoire : <Balles value={rewardFor('win', division)} /> · Nul :{' '}
            <Balles value={rewardFor('draw', division)} />
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
          <h2>Mon équipe</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={autoTeam} disabled={!collection.length}>
            Équipe auto
          </button>
        </div>
        <p className="muted small">
          Varie les profils : un géant, un poids plume, un animal qui vit très vieux, une espèce très rare, des animaux de plusieurs continents… Pendant le
          duel, les mesures sont cachées : à toi de savoir.
        </p>
        <div className="team-slots">
          {slots.map((card, i) => (
            <div key={i} className="team-slot">
              {card ? (
                <>
                  <Card card={card} size="sm" hideFacts onClick={() => openDetail({ card })} />
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
        <button
          type="button"
          className="btn btn--primary btn--xl"
          disabled={filled.length < TEAM_SIZE}
          onClick={() => {
            sfx.whoosh();
            startMatch();
          }}
        >
          {filled.length < TEAM_SIZE ? `Choisis ${TEAM_SIZE - filled.length} anima${TEAM_SIZE - filled.length > 1 ? 'ux' : 'l'} de plus` : 'Lancer le duel'}
        </button>
      </section>

      <details className="panel rules">
        <summary>
          <h2>Règles du duel de records</h2>
        </summary>
        <p>
          Un duel se joue en {ROUNDS} manches. Chaque manche est une question tirée au sort, annoncée dès le début : un record (le plus lourd, le plus petit…)
          ou une question oui/non (« Vient d’Afrique ? », « Est un oiseau ? »). Tu choisis quel animal envoyer, sans voir ses mesures : c’est un jeu de culture
          générale. Chaque animal ne joue qu’une fois. Ce sont les vraies mesures de l’espèce qui comptent ; un animal dont la mesure n’est pas connue perd la
          manche, et pour une question, oui bat non.
        </p>
        <ul className="rules__events">
          {RECORD_ORDER.map((id) => (
            <li key={id}>
              <b>{RECORDS[id].name}</b> : {RECORDS[id].desc}
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
    </>
  );
}

function RoundResolution({ match, log, onNext }: { match: DuelState; log: DuelRound; onNext: () => void }) {
  const me = match.me.cards[log.me];
  const opp = match.opp.cards[log.opp];
  useEffect(() => {
    const id = window.setTimeout(() => {
      sfx.hit();
      if (log.winner === 'me') sfx.reveal(2);
      if (log.winner === 'opp') sfx.error();
    }, 700);
    return () => window.clearTimeout(id);
  }, [log]);
  const record = RECORDS[log.record];

  const side = (who: 'me' | 'opp') => {
    const card = who === 'me' ? me : opp;
    const value = who === 'me' ? log.myValue : log.oppValue;
    return (
      <div className={`clash__side clash__side--${who}${log.winner === who ? ' is-winner' : ''}`}>
        <p className="clash__team">{who === 'me' ? match.me.name : match.opp.name}</p>
        <Card card={card} size="md" hideFacts />
        <p className="clash__power clash__power--record">{formatRecordValue(card, log.record, value)}</p>
      </div>
    );
  };

  return (
    <div className={`clash clash--${log.winner}`}>
      <p className="clash__event">
        Manche {log.round + 1} · {record.name}
      </p>
      <div className="clash__arena">
        {side('me')}
        <span className="clash__vs" aria-hidden="true">
          VS
        </span>
        {side('opp')}
      </div>
      <p className="clash__verdict" role="status">
        {log.winner === 'me' ? 'Manche gagnée !' : log.winner === 'opp' ? 'Manche perdue' : 'Égalité parfaite'}
      </p>
      <button type="button" className="btn btn--primary btn--lg" onClick={onNext}>
        {match.finished ? 'Voir le résultat' : 'Manche suivante'}
      </button>
    </div>
  );
}

function DuelView({ match }: { match: DuelState }) {
  const play = useGame((s) => s.playMatchRound);
  const finish = useGame((s) => s.finishMatch);
  const abandon = useGame((s) => s.abandonMatch);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);

  const recordId = match.records[match.round];
  const record = recordId ? RECORDS[recordId] : null;

  if (match.finished && !revealing) {
    const result = duelResult(match);
    return (
      <section className={`panel final final--${result}`}>
        <p className="eyebrow">Fin du duel · {match.friend ? `contre ton ami ${match.friend}` : `Division ${match.division}`}</p>
        <h1>{result === 'win' ? 'Victoire !' : result === 'draw' ? 'Match nul' : 'Défaite'}</h1>
        <p className="final__score">
          {match.me.name} {match.me.score} – {match.opp.score} {match.opp.name}
        </p>
        <ol className="final__rounds">
          {match.log.map((log) => (
            <li key={log.round} className={`is-${log.winner}`}>
              <span>{RECORDS[log.record].name}</span>
              <span>
                {ATHLETES_BY_ID[match.me.cards[log.me].athleteId].last} ({formatRecordValue(match.me.cards[log.me], log.record, log.myValue)}) –{' '}
                {ATHLETES_BY_ID[match.opp.cards[log.opp].athleteId].last} ({formatRecordValue(match.opp.cards[log.opp], log.record, log.oppValue)})
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

  return (
    <div className="match">
      <section className="scoreboard" aria-label="Score">
        <div className="scoreboard__team">
          <span>{match.me.name}</span>
        </div>
        <div className="scoreboard__score">
          <b>{match.me.score}</b>
          <span>–</span>
          <b>{match.opp.score}</b>
        </div>
        <div className="scoreboard__team scoreboard__team--opp">
          <span>{match.opp.name}</span>
        </div>
        <ol className="scoreboard__rounds" aria-label="Records du duel">
          {match.records.map((id, i) => (
            <li key={i} className={i < match.round ? `is-${match.log[i].winner}` : i === match.round ? 'is-current' : ''}>
              {RECORDS[id].name}
            </li>
          ))}
        </ol>
      </section>

      {record && (
        <section className="event-banner">
          <p className="eyebrow">
            Manche {match.round + 1} sur {ROUNDS}
          </p>
          <h2>{record.name}</h2>
          <p>{record.desc}</p>
        </section>
      )}

      <section className="panel">
        <h3 className="panel__title">L’équipe adverse</h3>
        <p className="muted small">Personne ne voit les mesures : c’est ta culture générale qui compte.</p>
        <div className="card-row card-row--tight">
          {match.opp.cards.map((card, i) => (
            <div key={card.uid} className={`opp-card${match.opp.used.includes(i) ? ' is-used' : ''}`}>
              <Card card={card} size="xs" hideFacts />
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <h3 className="panel__title">Choisis ton animal pour « {record?.name} »</h3>
        <div className="hand">
          {match.me.cards.map((card, i) => {
            const used = match.me.used.includes(i);
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
                aria-label={ATHLETES_BY_ID[card.athleteId].last}
              >
                <Card card={card} size="sm" hideFacts />
              </button>
            );
          })}
        </div>
        <div className="btn-row">
          <button
            type="button"
            className="btn btn--primary btn--xl"
            disabled={selected === null}
            onClick={() => {
              if (selected === null) return;
              play(selected);
              setSelected(null);
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
          <p className="eyebrow">Duel de records</p>
          <h1>{match ? `${match.me.name} contre ${match.opp.name}` : 'Composer mon équipe'}</h1>
          {!match && <p className="muted">5 animaux, 5 questions : le plus lourd, le plus petit, vient d’Afrique… Les mesures sont cachées : c’est ta culture générale qui compte.</p>}
        </div>
      </header>
      {match ? <DuelView key={match.id} match={match} /> : <TeamBuilder />}
    </div>
  );
}
