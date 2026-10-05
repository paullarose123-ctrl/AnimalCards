import { create } from 'zustand';
import { AccountError } from '../account/supabase';
import { buyOnline, cancelOnline, fetchActive, fetchHistory, fetchMine, listOnline, markDone, type OnlineListing } from '../account/market';
import { freshSession, useAccount } from './account';
import { useGame } from './game';

// Marché en ligne entre joueurs : les annonces de tout le monde, mes ventes, et le règlement dans la partie
// (carte livrée à l'acheteur, graines versées au vendeur, carte rendue si elle n'est pas vendue).
// Chaque règlement est fait une seule fois (useGame.settleOnline) puis confirmé au serveur (markDone).

export const ONLINE_HOURS = [1, 6, 24, 72] as const;
export const ONLINE_MAX_LISTINGS = 15;

interface OnlineState {
  /** annonces en cours de tous les joueurs */
  active: OnlineListing[];
  /** mes annonces et achats pas encore réglés */
  mine: OnlineListing[];
  /** mes dernières ventes et mes derniers achats */
  history: OnlineListing[];
  loaded: boolean;
  error: string | null;
  /** annonce en cours d'achat ou de retrait */
  pending: string | null;
  sync: () => Promise<void>;
  list: (uid: string, price: number, hours: number) => Promise<boolean>;
  buy: (listing: OnlineListing) => Promise<boolean>;
  cancel: (listing: OnlineListing) => Promise<boolean>;
}

const message = (error: unknown) => (error instanceof AccountError ? error.message : 'Le marché en ligne ne répond pas. Réessaie dans un moment.');

let syncing: Promise<void> | null = null;

/** Règle dans la partie tout ce que le serveur a conclu pour moi, puis le confirme. */
async function settle(mine: OnlineListing[]): Promise<OnlineListing[]> {
  const session = await freshSession();
  if (!session) return mine;
  const game = useGame.getState();
  const me = session.userId;
  const left: OnlineListing[] = [];
  for (const listing of mine) {
    try {
      if (listing.buyerId === me && listing.status === 'sold' && !listing.buyerDone) {
        game.settleOnline('buy', listing);
        await markDone(session, listing.id);
      } else if (listing.sellerId === me && listing.status === 'sold' && !listing.sellerDone) {
        game.settleOnline('sell', listing);
        await markDone(session, listing.id);
      } else if (listing.sellerId === me && listing.status === 'cancelled' && !listing.sellerDone) {
        game.settleOnline('back', listing);
        await markDone(session, listing.id);
      } else if (listing.sellerId === me && listing.status === 'active' && listing.expiresAt <= Date.now()) {
        // annonce expirée : la carte revient dans la réserve
        const closed = await cancelOnline(session, listing.id);
        game.settleOnline('back', { ...closed, expired: true });
        await markDone(session, listing.id);
      } else {
        left.push(listing);
      }
    } catch {
      // réessayé à la prochaine synchronisation (chaque règlement n'est appliqué qu'une fois)
      left.push(listing);
    }
  }
  return left;
}

export const useOnline = create<OnlineState>()((set, get) => ({
  active: [],
  mine: [],
  history: [],
  loaded: false,
  error: null,
  pending: null,

  sync: () => {
    syncing ??= (async () => {
      try {
        const session = await freshSession().catch(() => null);
        const [active, mine, history] = await Promise.all([
          fetchActive(session?.accessToken),
          session ? fetchMine(session) : Promise.resolve([]),
          session ? fetchHistory(session) : Promise.resolve([]),
        ]);
        const left = session ? await settle(mine) : [];
        set({ active, mine: left, history, loaded: true, error: null });
      } catch (error) {
        set({ error: message(error), loaded: true });
      } finally {
        syncing = null;
      }
    })();
    return syncing;
  },

  list: async (uid, price, hours) => {
    const game = useGame.getState();
    const session = await freshSession().catch(() => null);
    if (!session) {
      game.toast('error', 'Connecte-toi à ton compte pour vendre aux autres joueurs.');
      return false;
    }
    if (get().mine.filter((l) => l.sellerId === session.userId && l.status === 'active').length >= ONLINE_MAX_LISTINGS) {
      game.toast('error', `Tu as déjà ${ONLINE_MAX_LISTINGS} cartes en vente en ligne. Attends qu’une vente se termine.`);
      return false;
    }
    // la carte quitte la réserve pendant la vente ; elle revient si la mise en vente échoue
    const card = game.escrowCard(uid);
    if (!card) {
      game.toast('error', 'Cette carte ne peut pas être vendue (elle est peut-être verrouillée).');
      return false;
    }
    try {
      const listing = await listOnline(session, card, price, hours);
      set((s) => ({ mine: [listing, ...s.mine], active: [listing, ...s.active] }));
      void useAccount.getState().saveNow();
      game.toast('info', 'Ta carte est en vente : tous les joueurs peuvent l’acheter.');
      return true;
    } catch (error) {
      useGame.getState().restoreCard(card);
      game.toast('error', message(error));
      return false;
    }
  },

  buy: async (listing) => {
    const game = useGame.getState();
    const session = await freshSession().catch(() => null);
    if (!session) {
      game.toast('error', 'Connecte-toi à ton compte pour acheter aux autres joueurs.');
      return false;
    }
    if (game.unlimited) {
      game.toast('error', 'Les crédits illimités sont un mode de test : coupe-les pour acheter aux autres joueurs.');
      return false;
    }
    if (game.balles < listing.price) {
      game.toast('error', `Il te manque ${(listing.price - game.balles).toLocaleString('fr-FR')} crédits`);
      return false;
    }
    set({ pending: listing.id });
    try {
      const sold = await buyOnline(session, listing.id);
      useGame.getState().settleOnline('buy', sold);
      set((s) => ({ active: s.active.filter((l) => l.id !== listing.id), history: [sold, ...s.history] }));
      await markDone(session, sold.id).catch(() => undefined);
      void useAccount.getState().saveNow();
      return true;
    } catch (error) {
      game.toast('error', message(error));
      set((s) => ({ active: s.active.filter((l) => l.id !== listing.id) }));
      return false;
    } finally {
      set({ pending: null });
      void get().sync();
    }
  },

  cancel: async (listing) => {
    const game = useGame.getState();
    const session = await freshSession().catch(() => null);
    if (!session) return false;
    set({ pending: listing.id });
    try {
      const closed = await cancelOnline(session, listing.id);
      useGame.getState().settleOnline('back', closed);
      await markDone(session, closed.id).catch(() => undefined);
      set((s) => ({ mine: s.mine.filter((l) => l.id !== listing.id), active: s.active.filter((l) => l.id !== listing.id) }));
      void useAccount.getState().saveNow();
      return true;
    } catch (error) {
      game.toast('error', message(error));
      return false;
    } finally {
      set({ pending: null });
      void get().sync();
    }
  },
}));
