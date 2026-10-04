import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  AccountError,
  accountsEnabled,
  loadSave,
  refresh,
  signIn,
  signOut,
  signUp,
  storeProfile,
  storeSave,
  type Session,
} from '../account/supabase';
import type { CardFace } from '../engine/types';
import { readSave, useGame, writeSave } from './game';

// Compte du joueur : la session Supabase (gardée dans le navigateur) et la sauvegarde automatique.
// En invité, la partie reste dans ce navigateur. Une fois connecté, elle est envoyée au compte au plus toutes les
// SAVE_EVERY millisecondes quand elle change, et dès que l'onglet est caché ou fermé.

const SAVE_EVERY = 30_000;

export type SyncStatus = 'idle' | 'saving' | 'saved' | 'error';

interface AccountState {
  session: Session | null;
  status: SyncStatus;
  lastSavedAt: number | null;
  error: string | null;
  /** inscription ou connexion en cours */
  busy: boolean;
  register: (pseudo: string, password: string) => Promise<boolean>;
  login: (pseudo: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  saveNow: () => Promise<boolean>;
}

/** dernière sauvegarde envoyée (pour ne pas renvoyer la même) */
let lastSent: string | null = null;
let timer: number | undefined;

/** La session, avec un jeton encore valable au moins une minute (rafraîchi au besoin). */
async function freshSession(): Promise<Session | null> {
  const session = useAccount.getState().session;
  if (!session) return null;
  if (session.expiresAt - Date.now() > 60_000) return session;
  try {
    const next = await refresh(session);
    useAccount.setState({ session: next });
    return next;
  } catch (error) {
    // jeton de rafraîchissement refusé (et pas une simple coupure réseau) : il faut se reconnecter,
    // la partie reste dans le navigateur
    if (error instanceof AccountError && !/joindre/.test(error.message)) useAccount.setState({ session: null, status: 'idle' });
    throw error;
  }
}

/** Les cartes de la vitrine, telles que les autres joueurs les verront. */
function favoriteFaces(): CardFace[] {
  const { favorites, collection } = useGame.getState();
  return favorites
    .map((uid) => collection.find((card) => card.uid === uid))
    .filter((card): card is NonNullable<typeof card> => !!card)
    .map(({ athleteId, variant }) => ({ athleteId, variant }));
}

async function upload(keepalive = false): Promise<boolean> {
  const raw = readSave();
  if (!raw || raw === lastSent) return true;
  useAccount.setState({ status: 'saving' });
  try {
    const session = await freshSession();
    if (!session) return false;
    // keepalive (envoi qui survit à la fermeture de l'onglet) est limité à 64 Ko par le navigateur
    await storeSave(session, JSON.parse(raw), keepalive && raw.length < 60_000);
    lastSent = raw;
    useAccount.setState({ status: 'saved', lastSavedAt: Date.now(), error: null });
    return true;
  } catch (error) {
    useAccount.setState({ status: 'error', error: error instanceof Error ? error.message : 'Sauvegarde impossible.' });
    return false;
  }
}

/** Après la connexion : reprend la partie du compte, ou y envoie celle du navigateur si le compte est neuf. */
async function adopt(session: Session, fresh: boolean): Promise<void> {
  useAccount.setState({ session, error: null });
  if (!fresh) {
    const remote = await loadSave(session);
    if (remote) {
      await writeSave(JSON.stringify(remote.data));
      lastSent = readSave();
      useAccount.setState({ status: 'saved', lastSavedAt: Date.parse(remote.updatedAt) || Date.now() });
      useGame.getState().toast('success', `Bon retour ${session.pseudo} ! Ta progression est rechargée.`);
      await storeProfile(session, favoriteFaces()).catch(() => undefined);
      return;
    }
  }
  lastSent = null;
  await upload();
  await storeProfile(session, favoriteFaces()).catch(() => undefined);
  useGame.getState().toast('gold', fresh ? `Compte créé : bienvenue ${session.pseudo} ! Ta progression est sauvegardée.` : `Connecté : ta progression est sauvegardée dans ton compte.`);
}

export const useAccount = create<AccountState>()(
  persist(
    (set, get) => ({
      session: null,
      status: 'idle',
      lastSavedAt: null,
      error: null,
      busy: false,

      register: async (pseudo, password) => {
        set({ busy: true, error: null });
        try {
          const session = await signUp(pseudo, password);
          await adopt(session, true);
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Création du compte impossible.' });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      login: async (pseudo, password) => {
        set({ busy: true, error: null });
        try {
          const session = await signIn(pseudo, password);
          await adopt(session, false);
          return true;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : 'Connexion impossible.' });
          return false;
        } finally {
          set({ busy: false });
        }
      },

      logout: async () => {
        const session = get().session;
        if (!session) return;
        set({ busy: true });
        // dernière sauvegarde avant de partir : si elle échoue, la partie reste dans ce navigateur
        const saved = await upload();
        await signOut(session);
        lastSent = null;
        set({ session: null, status: 'idle', lastSavedAt: null, error: null, busy: false });
        if (saved) {
          // la progression part avec le compte : le navigateur repart d'une partie neuve
          useGame.getState().resetGame();
          useGame.getState().toast('info', 'Déconnecté. Ta progression t’attend dans ton compte.');
        } else {
          useGame.getState().toast('warn', 'Déconnecté, mais la dernière sauvegarde n’a pas pu partir : ta partie reste dans ce navigateur.');
        }
      },

      saveNow: async () => {
        const ok = await upload();
        const session = get().session;
        if (ok && session) await storeProfile(session, favoriteFaces()).catch(() => undefined);
        return ok;
      },
    }),
    {
      name: 'animalcards-compte',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ session: state.session, lastSavedAt: state.lastSavedAt }),
    },
  ),
);

/** Lance la sauvegarde automatique (une fois, au démarrage du jeu). */
export function startAutoSave(): void {
  if (!accountsEnabled() || typeof window === 'undefined') return;
  // au démarrage, la partie du navigateur est celle de la dernière session : rien à renvoyer tant qu'elle ne change pas
  lastSent = readSave();
  useGame.subscribe(() => {
    if (!useAccount.getState().session || timer !== undefined) return;
    timer = window.setTimeout(() => {
      timer = undefined;
      void upload();
    }, SAVE_EVERY);
  });
  // la vitrine est publique : elle est envoyée dès qu'elle change
  let favorites = useGame.getState().favorites;
  useGame.subscribe((state) => {
    if (state.favorites === favorites) return;
    favorites = state.favorites;
    const session = useAccount.getState().session;
    if (session) void freshSession().then((s) => s && storeProfile(s, favoriteFaces())).catch(() => undefined);
  });
  const flush = () => {
    if (!useAccount.getState().session) return;
    window.clearTimeout(timer);
    timer = undefined;
    void upload(true);
  };
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
  window.addEventListener('pagehide', flush);
}
