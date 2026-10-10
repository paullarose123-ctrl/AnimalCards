import { accountsEnabled, call } from './supabase';

// Joueurs en ligne (table presence et fonction presence_ping de supabase/schema.sql).
// Chaque navigateur reçoit un identifiant anonyme tiré au hasard, gardé dans le navigateur : le même joueur revenu
// dix fois dans la journée ne compte qu'une fois, qu'il ait un compte ou non. Rien d'autre n'est envoyé.

export interface PresenceCounts {
  /** visiteurs qui ont le jeu ouvert en ce moment */
  online: number;
  /** visiteurs passés au moins une fois depuis minuit (heure de Paris) */
  today: number;
}

const VISITOR_KEY = 'animalcards-visiteur';
let memoryVisitor: string | null = null;

function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // navigateurs sans randomUUID (page hors https) : un UUID v4 à la main
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** L'identifiant anonyme de ce navigateur (créé à la première visite). */
export function visitorId(): string {
  try {
    const saved = window.localStorage.getItem(VISITOR_KEY);
    if (saved) return saved;
    const id = randomId();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // stockage indisponible (navigation privée, aperçu) : un identifiant le temps de la visite
    memoryVisitor ??= randomId();
    return memoryVisitor;
  }
}

/**
 * Signale que ce visiteur a le jeu ouvert (ou qu'il s'en va) et renvoie les compteurs,
 * ou null si le serveur ne répond pas (ou si la fonction n'a pas encore été ajoutée à la base).
 */
export async function pingPresence(online: boolean): Promise<PresenceCounts | null> {
  if (!accountsEnabled()) return null;
  try {
    const counts = await call<{ online: number; today: number }>('/rest/v1/rpc/presence_ping', {
      method: 'POST',
      body: { p_visitor: visitorId(), p_online: online },
      // le dernier signal part même si la page se ferme
      keepalive: !online,
    });
    if (!counts || typeof counts.online !== 'number' || typeof counts.today !== 'number') return null;
    return { online: counts.online, today: counts.today };
  } catch {
    return null;
  }
}
