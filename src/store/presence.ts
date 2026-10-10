import { create } from 'zustand';
import { pingPresence } from '../account/presence';

// Compteurs de joueurs : en ligne maintenant, et passés aujourd'hui. Tant que le jeu est affiché, il envoie un
// signal toutes les minutes ; quand l'onglet passe en arrière-plan ou se ferme, un dernier signal le retire des
// joueurs en ligne (sinon il en sort tout seul 2 min 30 après son dernier signal).

export const PRESENCE_EVERY = 60_000;

interface PresenceState {
  /** null tant que le serveur n'a pas répondu (le compteur reste caché) */
  online: number | null;
  today: number | null;
}

export const usePresence = create<PresenceState>()(() => ({ online: null, today: null }));

/** Lance les signaux de présence ; renvoie de quoi les arrêter. */
export function startPresence(): () => void {
  let timer: number | undefined;
  // dernier état envoyé : on ne signale pas deux fois de suite un départ
  let sent: 'online' | 'away' | null = null;

  const ping = async (online: boolean) => {
    if (!online && sent === 'away') return;
    sent = online ? 'online' : 'away';
    const counts = await pingPresence(online);
    if (counts) usePresence.setState(counts);
  };

  const onVisibility = () => {
    window.clearInterval(timer);
    if (document.visibilityState === 'visible') {
      void ping(true);
      timer = window.setInterval(() => void ping(true), PRESENCE_EVERY);
    } else {
      void ping(false);
    }
  };
  const onLeave = () => void ping(false);

  onVisibility();
  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pagehide', onLeave);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pagehide', onLeave);
  };
}
