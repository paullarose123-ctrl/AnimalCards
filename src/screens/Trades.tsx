import { useMemo, useState } from 'react';
import { useGame } from '../store/game';
import { useAccount } from '../store/account';
import { useUi } from '../store/ui';
import { copyToGive, sameRarity, useTrades } from '../store/trades';
import { ATHLETES, ATHLETES_BY_ID } from '../data/athletes';
import { displayName, rarityOf } from '../engine/cards';
import type { CardFace, OwnedCard } from '../engine/types';
import type { PublicProfile } from '../account/supabase';
import type { Trade } from '../account/trades';
import { Card } from '../components/Card';
import { useNow, timeAgo } from '../hooks/useNow';

// Échanges entre amis : proposer une de ses cartes contre une espèce de même rareté, et répondre aux propositions.

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

const label = (face: CardFace) => `${ATHLETES_BY_ID[face.athleteId]?.last ?? '?'}${face.variant === 'prime' ? ' (Prime)' : face.variant === 'reverse' ? ' (Reverse)' : ''}`;

/** Fenêtre d'échange avec un ami : 1. la carte que je propose, 2. l'espèce que je veux en retour (même rareté). */
export function TradeModal({ friend, onClose }: { friend: PublicProfile; onClose: () => void }) {
  const collection = useGame((s) => s.collection);
  const discovered = useGame((s) => s.discovered);
  const propose = useTrades((s) => s.propose);
  const [offer, setOffer] = useState<OwnedCard | null>(null);
  const [want, setWant] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  // mes cartes échangeables : une par espèce et finition
  const mine = useMemo(() => {
    const seen = new Set<string>();
    const q = normalize(query.trim());
    return collection
      .filter((c) => !c.locked && ATHLETES_BY_ID[c.athleteId])
      .filter((c) => {
        const key = `${c.athleteId}:${c.variant}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return !q || normalize(displayName(ATHLETES_BY_ID[c.athleteId])).includes(q);
      })
      .sort((a, b) => rarityOf(ATHLETES_BY_ID[b.athleteId]).order - rarityOf(ATHLETES_BY_ID[a.athleteId]).order);
  }, [collection, query]);

  // espèces de même rareté, celles de sa vitrine d'abord, puis celles qui me manquent
  const wanted = useMemo(() => {
    if (!offer) return [];
    const showcase = new Set(friend.favorites.map((f) => f?.athleteId));
    const q = normalize(query.trim());
    return ATHLETES.filter((a) => a.id !== offer.athleteId && sameRarity(a.id, offer.athleteId) && (!q || normalize(displayName(a)).includes(q))).sort(
      (a, b) => Number(showcase.has(b.id)) - Number(showcase.has(a.id)) || Number(!!discovered[a.id]) - Number(!!discovered[b.id]) || a.last.localeCompare(b.last, 'fr'),
    );
  }, [offer, friend.favorites, discovered, query]);

  const send = async () => {
    if (!offer || !want) return;
    setBusy(true);
    const ok = await propose(friend.id, offer.uid, want);
    setBusy(false);
    if (ok) onClose();
  };

  const showcase = new Set(friend.favorites.map((f) => f?.athleteId));
  const rarity = offer ? rarityOf(ATHLETES_BY_ID[offer.athleteId]) : null;

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="trade-title" onClick={onClose}>
      <div className="modal__panel trade" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2 id="trade-title">Échanger avec {friend.pseudo}</h2>
        <ol className="trade__steps">
          <li className={offer ? 'is-done' : 'is-current'}>Ta carte</li>
          <li className={!offer ? '' : want ? 'is-done' : 'is-current'}>Contre quelle espèce</li>
          <li className={want ? 'is-current' : ''}>Proposer</li>
        </ol>

        {offer && (
          <div className="trade__deal">
            <div className="trade__side">
              <Card card={offer} size="sm" />
              <button
                type="button"
                className="btn btn--ghost btn--xs"
                onClick={() => {
                  setOffer(null);
                  setWant(null);
                  setQuery('');
                }}
              >
                Changer
              </button>
            </div>
            <span className="trade__arrows" aria-hidden="true">
              ⇄
            </span>
            <div className="trade__side">
              {want ? <Card card={{ athleteId: want, variant: 'base' }} size="sm" /> : <div className="trade__empty">?</div>}
              {want && (
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setWant(null)}>
                  Changer
                </button>
              )}
            </div>
          </div>
        )}

        {!want && (
          <>
            <p className="muted small">
              {offer
                ? `Choisis une espèce ${rarity?.name.toLowerCase()} en retour : un échange se fait toujours entre cartes de même rareté. Celles de sa vitrine sont en premier.`
                : 'Choisis la carte que tu proposes. Elle quitte ta réserve le temps que ton ami réponde, et revient s’il refuse.'}
            </p>
            <label className="field">
              <span className="visually-hidden">Chercher</span>
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un animal…" />
            </label>
            <div className="trade__grid">
              {!offer &&
                mine.map((c) => (
                  <button key={c.uid} type="button" className="trade__pick" onClick={() => (setOffer(c), setQuery(''))}>
                    <Card card={c} size="xs" />
                  </button>
                ))}
              {offer &&
                wanted.slice(0, 120).map((a) => (
                  <button key={a.id} type="button" className="trade__pick" onClick={() => setWant(a.id)}>
                    <Card card={{ athleteId: a.id, variant: 'base' }} size="xs" locked={!discovered[a.id]} />
                    {showcase.has(a.id) ? <span className="trade__hint is-showcase">Sa vitrine</span> : !discovered[a.id] && <span className="trade__hint">Nouveau</span>}
                  </button>
                ))}
            </div>
            {!offer && !mine.length && <p className="muted">Aucune carte à proposer (les cartes verrouillées ne s’échangent pas).</p>}
          </>
        )}

        {offer && want && (
          <div className="trade__confirm">
            <p>
              Tu proposes <b>{label(offer)}</b> à {friend.pseudo} contre un exemplaire de <b>{ATHLETES_BY_ID[want].last}</b>.
            </p>
            <button type="button" className="btn btn--primary btn--lg" disabled={busy} onClick={send}>
              {busy ? 'Envoi…' : 'Proposer l’échange'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TradeRow({ trade, me }: { trade: Trade; me: string }) {
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const accept = useTrades((s) => s.accept);
  const decline = useTrades((s) => s.decline);
  const cancel = useTrades((s) => s.cancel);
  const busy = useTrades((s) => s.pending === trade.id);
  const now = useNow(30_000);
  const received = trade.toId === me;
  const other = received ? trade.from : trade.to;
  const want: CardFace = trade.given ?? { athleteId: trade.wantId, variant: 'base' };
  const canGive = received && !!copyToGive(collection, trade.wantId);

  let status: string;
  if (trade.status === 'pending') status = received ? `${other} te propose` : `En attente de ${other}`;
  else if (trade.status === 'accepted') status = `Échange conclu avec ${other}`;
  else if (trade.status === 'declined') status = received ? `Tu as refusé ${other}` : `${other} a refusé`;
  else status = 'Annulé';

  return (
    <li className={`trade-row is-${trade.status}`}>
      <div className="trade-row__cards">
        <Card card={trade.offer} size="xs" onClick={() => openDetail({ card: trade.offer })} />
        <span className="trade__arrows" aria-hidden="true">
          ⇄
        </span>
        <Card card={want} size="xs" onClick={() => openDetail({ card: want })} />
      </div>
      <div className="trade-row__info">
        <b>{status}</b>
        <span className="muted small">
          {received ? `${other} donne ${label(trade.offer)} et veut ${ATHLETES_BY_ID[trade.wantId]?.last}` : `Tu donnes ${label(trade.offer)} et tu veux ${ATHLETES_BY_ID[trade.wantId]?.last}`} ·{' '}
          {timeAgo(trade.updatedAt, now)}
        </span>
        {received && trade.status === 'pending' && !canGive && <span className="account__error small">Tu n’as pas de {ATHLETES_BY_ID[trade.wantId]?.last} disponible.</span>}
      </div>
      <div className="trade-row__actions">
        {trade.status === 'pending' && received && (
          <>
            <button type="button" className="btn btn--primary btn--sm" disabled={busy || !canGive} onClick={() => accept(trade)}>
              Accepter
            </button>
            <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => decline(trade)}>
              Refuser
            </button>
          </>
        )}
        {trade.status === 'pending' && !received && (
          <button type="button" className="btn btn--ghost btn--sm" disabled={busy} onClick={() => cancel(trade)}>
            Annuler
          </button>
        )}
      </div>
    </li>
  );
}

/** Panneau des échanges du profil : propositions reçues, envoyées, et derniers échanges. */
export function TradesPanel() {
  const me = useAccount((s) => s.session?.userId);
  const trades = useTrades((s) => s.trades);
  const error = useTrades((s) => s.error);
  if (!me) return null;
  const pending = trades.filter((t) => t.status === 'pending');
  const received = pending.filter((t) => t.toId === me);
  const sent = pending.filter((t) => t.fromId === me);
  const history = trades.filter((t) => t.status !== 'pending').slice(0, 6);
  return (
    <section className="panel" aria-labelledby="trades-title">
      <h2 id="trades-title">
        Échanges <small>· entre amis, cartes de même rareté</small>
      </h2>
      {error && <p className="account__error">{error}</p>}
      {!trades.length && <p className="muted">Aucun échange pour l’instant. Touche « Échanger » à côté d’un ami pour lui proposer une carte.</p>}
      {received.length > 0 && (
        <>
          <h3 className="friends__title">Propositions reçues</h3>
          <ul className="trade-list">
            {received.map((t) => (
              <TradeRow key={t.id} trade={t} me={me} />
            ))}
          </ul>
        </>
      )}
      {sent.length > 0 && (
        <>
          <h3 className="friends__title">Mes propositions</h3>
          <ul className="trade-list">
            {sent.map((t) => (
              <TradeRow key={t.id} trade={t} me={me} />
            ))}
          </ul>
        </>
      )}
      {history.length > 0 && (
        <>
          <h3 className="friends__title">Derniers échanges</h3>
          <ul className="trade-list">
            {history.map((t) => (
              <TradeRow key={t.id} trade={t} me={me} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
