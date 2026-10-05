import { create } from 'zustand';
import { AccountError } from '../account/supabase';
import { acceptTrade, cancelTrade, declineTrade, fetchTrades, proposeTrade, tradeDone, type Trade } from '../account/trades';
import { ATHLETES_BY_ID } from '../data/athletes';
import { rarityOf } from '../engine/cards';
import type { CardFace, OwnedCard } from '../engine/types';
import { freshSession, useAccount } from './account';
import { useGame } from './game';

// Échanges de cartes entre amis, de même rareté. La carte proposée quitte la réserve tant que l'échange attend ;
// elle revient si l'ami refuse ou si on annule. À l'acceptation, chacun reçoit la carte de l'autre.

export const MAX_PENDING_TRADES = 10;

/** Deux cartes peuvent s'échanger si leurs espèces ont la même rareté. */
export function sameRarity(a: string, b: string): boolean {
  const x = ATHLETES_BY_ID[a];
  const y = ATHLETES_BY_ID[b];
  return !!x && !!y && rarityOf(x).id === rarityOf(y).id;
}

/** L'exemplaire que je donnerais pour une espèce demandée : non verrouillé, de préférence le plus simple. */
export function copyToGive(collection: OwnedCard[], athleteId: string): OwnedCard | undefined {
  const rank = { base: 0, reverse: 1, prime: 2 } as const;
  return collection
    .filter((c) => c.athleteId === athleteId && !c.locked)
    .sort((a, b) => rank[a.variant] - rank[b.variant])[0];
}

const name = (id: string) => ATHLETES_BY_ID[id]?.last ?? 'une carte';
const message = (error: unknown) => (error instanceof AccountError ? error.message : 'Les échanges ne répondent pas. Réessaie dans un moment.');

interface TradesState {
  trades: Trade[];
  error: string | null;
  pending: string | null;
  sync: () => Promise<void>;
  propose: (toId: string, uid: string, wantId: string) => Promise<boolean>;
  accept: (trade: Trade) => Promise<boolean>;
  decline: (trade: Trade) => Promise<boolean>;
  cancel: (trade: Trade) => Promise<boolean>;
}

let syncing: Promise<void> | null = null;

/** Règle dans la partie les échanges conclus pour moi, puis le confirme au serveur. */
async function settle(trades: Trade[]): Promise<void> {
  const session = await freshSession();
  if (!session) return;
  const game = useGame.getState();
  const me = session.userId;
  for (const t of trades) {
    try {
      if (t.fromId === me && !t.fromDone && t.status !== 'pending') {
        if (t.status === 'accepted' && t.given) game.receiveOnce(`trade-in:${t.id}`, t.given, `${t.to} a accepté l’échange : ${name(t.given.athleteId)} rejoint ta réserve`);
        else game.receiveOnce(`trade-back:${t.id}`, t.offer, `${name(t.offer.athleteId)} revient dans ta réserve (échange ${t.status === 'declined' ? 'refusé' : 'annulé'})`);
        await tradeDone(session, t.id);
      } else if (t.toId === me && !t.toDone && t.status === 'accepted') {
        game.receiveOnce(`trade-in:${t.id}`, t.offer, `${name(t.offer.athleteId)} rejoint ta réserve`);
        await tradeDone(session, t.id);
      }
    } catch {
      // réessayé à la prochaine synchronisation (chaque règlement n'est appliqué qu'une fois)
    }
  }
}

export const useTrades = create<TradesState>()((set, get) => ({
  trades: [],
  error: null,
  pending: null,

  sync: () => {
    syncing ??= (async () => {
      try {
        const session = await freshSession().catch(() => null);
        if (!session) {
          set({ trades: [], error: null });
          return;
        }
        const trades = await fetchTrades(session);
        await settle(trades);
        set({ trades, error: null });
      } catch (error) {
        set({ error: message(error) });
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  },

  propose: async (toId, uid, wantId) => {
    const game = useGame.getState();
    const session = await freshSession().catch(() => null);
    if (!session) return false;
    const offered = game.collection.find((c) => c.uid === uid);
    if (!offered || !sameRarity(offered.athleteId, wantId)) {
      game.toast('error', 'On ne peut échanger que deux cartes de même rareté.');
      return false;
    }
    if (get().trades.filter((t) => t.fromId === session.userId && t.status === 'pending').length >= MAX_PENDING_TRADES) {
      game.toast('error', `Tu as déjà ${MAX_PENDING_TRADES} propositions d’échange en attente.`);
      return false;
    }
    // la carte proposée quitte la réserve le temps de l'échange
    const card = game.escrowCard(uid);
    if (!card) {
      game.toast('error', 'Cette carte ne peut pas être échangée (elle est peut-être verrouillée).');
      return false;
    }
    try {
      const trade = await proposeTrade(session, toId, card as CardFace, wantId);
      set((s) => ({ trades: [trade, ...s.trades] }));
      void useAccount.getState().saveNow();
      game.toast('info', `Proposition envoyée à ${trade.to} : ${name(card.athleteId)} contre ${name(wantId)}.`);
      return true;
    } catch (error) {
      useGame.getState().restoreCard(card);
      game.toast('error', message(error));
      return false;
    }
  },

  accept: async (trade) => {
    const game = useGame.getState();
    const session = await freshSession().catch(() => null);
    if (!session) return false;
    const mine = copyToGive(game.collection, trade.wantId);
    if (!mine) {
      game.toast('error', `Tu n’as pas de ${name(trade.wantId)} à donner (ou il est verrouillé).`);
      return false;
    }
    const given = game.escrowCard(mine.uid);
    if (!given) return false;
    set({ pending: trade.id });
    try {
      const done = await acceptTrade(session, trade.id, given);
      useGame.getState().receiveOnce(`trade-in:${done.id}`, done.offer, `Échange conclu avec ${done.from} : ${name(done.offer.athleteId)} rejoint ta réserve`);
      await tradeDone(session, done.id).catch(() => undefined);
      set((s) => ({ trades: s.trades.map((t) => (t.id === done.id ? { ...done, toDone: true } : t)) }));
      void useAccount.getState().saveNow();
      return true;
    } catch (error) {
      useGame.getState().restoreCard(given);
      game.toast('error', message(error));
      return false;
    } finally {
      set({ pending: null });
      void get().sync();
    }
  },

  decline: async (trade) => {
    const session = await freshSession().catch(() => null);
    if (!session) return false;
    set({ pending: trade.id });
    try {
      const done = await declineTrade(session, trade.id);
      set((s) => ({ trades: s.trades.map((t) => (t.id === done.id ? done : t)) }));
      return true;
    } catch (error) {
      useGame.getState().toast('error', message(error));
      return false;
    } finally {
      set({ pending: null });
    }
  },

  cancel: async (trade) => {
    const session = await freshSession().catch(() => null);
    if (!session) return false;
    set({ pending: trade.id });
    try {
      const done = await cancelTrade(session, trade.id);
      useGame.getState().receiveOnce(`trade-back:${done.id}`, done.offer, `${name(done.offer.athleteId)} revient dans ta réserve`);
      await tradeDone(session, done.id).catch(() => undefined);
      set((s) => ({ trades: s.trades.map((t) => (t.id === done.id ? { ...done, fromDone: true } : t)) }));
      void useAccount.getState().saveNow();
      return true;
    } catch (error) {
      useGame.getState().toast('error', message(error));
      return false;
    } finally {
      set({ pending: null });
    }
  },
}));
