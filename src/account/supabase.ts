import type { CardFace } from '../engine/types';
import { currentFace } from '../engine/cards';
import { PSEUDO_EMAIL_DOMAIN, SUPABASE_KEY, SUPABASE_URL } from './config';

// Petit client Supabase, sans bibliothèque : l'authentification (GoTrue) et deux tables (PostgREST).
// - saves : la sauvegarde privée de chaque joueur (toute sa progression) ;
// - profiles : son profil public (pseudo et cartes préférées), visible par les autres joueurs.

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** fin de validité du jeton, en millisecondes */
  expiresAt: number;
  userId: string;
  pseudo: string;
}

export interface PublicProfile {
  /** identifiant du compte */
  id: string;
  pseudo: string;
  /** espèce dont la photo sert de photo de profil (vide : l'initiale du pseudo) */
  avatar: string;
  favorites: CardFace[];
  updatedAt: string;
}

/** Erreur prête à afficher au joueur. */
export class AccountError extends Error {}

export function accountsEnabled(): boolean {
  return !!SUPABASE_URL && !!SUPABASE_KEY;
}

const PSEUDO = /^[A-Za-z0-9_-]{3,20}$/;
export const MIN_PASSWORD = 6;

/** Ce qui ne va pas dans un pseudo, ou null s'il est valable. */
export function pseudoProblem(pseudo: string): string | null {
  if (pseudo.length < 3) return 'Ton pseudo doit faire au moins 3 caractères.';
  if (pseudo.length > 20) return 'Ton pseudo doit faire 20 caractères au maximum.';
  if (!PSEUDO.test(pseudo)) return 'Ton pseudo ne peut contenir que des lettres sans accent, des chiffres, « - » et « _ ».';
  return null;
}

const emailOf = (pseudo: string) => `${pseudo.toLowerCase()}@${PSEUDO_EMAIL_DOMAIN}`;

interface Options {
  method?: string;
  body?: unknown;
  token?: string;
  prefer?: string;
  keepalive?: boolean;
}

export async function call<T>(path: string, { method = 'GET', body, token, prefer, keepalive }: Options = {}): Promise<T> {
  if (!accountsEnabled()) throw new AccountError('Les comptes ne sont pas encore ouverts.');
  const headers: Record<string, string> = { apikey: SUPABASE_KEY };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  if (prefer) headers.Prefer = prefer;
  let response: Response;
  try {
    response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      keepalive,
    });
  } catch {
    throw new AccountError('Impossible de joindre le serveur. Vérifie ta connexion internet.');
  }
  const text = await response.text();
  const data = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) throw new AccountError(explain(response.status, data));
  return data as T;
}

/** Message d'erreur de Supabase traduit pour le joueur. */
function explain(status: number, data: unknown): string {
  const info = (data ?? {}) as { error_code?: string; code?: string; msg?: string; message?: string; error_description?: string };
  const code = info.error_code ?? info.code ?? '';
  const text = `${info.msg ?? ''} ${info.message ?? ''} ${info.error_description ?? ''}`.toLowerCase();
  if (code === 'user_already_exists' || code === 'email_exists' || text.includes('already registered')) return 'Ce pseudo est déjà pris. Choisis-en un autre.';
  if (code === 'invalid_credentials' || text.includes('invalid login credentials')) return 'Pseudo ou mot de passe incorrect.';
  if (code === 'weak_password' || text.includes('password should be')) return `Ton mot de passe est trop faible : au moins ${MIN_PASSWORD} caractères.`;
  if (code === 'email_not_confirmed') return 'Ce compte attend une confirmation par e-mail : la confirmation doit être coupée dans Supabase.';
  if (code === 'over_request_rate_limit' || code === 'over_email_send_rate_limit' || status === 429) return 'Trop d’essais d’un coup. Attends une minute et réessaie.';
  if (code === 'signup_disabled') return 'Les inscriptions sont fermées pour le moment.';
  if (code === 'PGRST205' || code === '42P01') return 'Cette fonction n’est pas encore activée sur le serveur du jeu.';
  // erreurs levées par les fonctions du marché en ligne (supabase/schema.sql)
  if (code === 'P0001') {
    if (text.includes('indisponible')) return 'Trop tard : cette carte ou cet échange n’est plus disponible.';
    if (text.includes('trop d')) return 'Tu as déjà 15 cartes en vente en ligne. Attends qu’une vente se termine.';
    if (text.includes('pas ami')) return 'Vous devez être amis pour échanger des cartes.';
    if (text.includes('trop d’échanges') || text.includes("trop d'échanges")) return 'Tu as déjà 10 propositions d’échange en attente.';
    if (text.includes('profil')) return 'Ton profil n’est pas encore enregistré. Réessaie dans un instant.';
    if (text.includes('non connect')) return 'Ta session a expiré. Reconnecte-toi.';
    return 'Cette annonce n’est pas valable.';
  }
  if (code === 'PGRST202') return 'Le marché en ligne n’est pas encore activé sur le serveur du jeu.';
  if (code === '23514') return 'Le prix doit être compris entre 10 et 100 000 000 crédits.';
  if (code === '23505') return 'Ce pseudo est déjà pris. Choisis-en un autre.';
  if (status === 401 || status === 403) return 'Ta session a expiré. Reconnecte-toi.';
  return 'Le serveur a répondu par une erreur. Réessaie dans un moment.';
}

interface AuthResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: { id: string; user_metadata?: { pseudo?: string } };
}

function toSession(data: AuthResponse, fallbackPseudo: string): Session {
  if (!data.access_token || !data.refresh_token || !data.user) {
    // le compte est créé mais Supabase attend une confirmation par e-mail (impossible avec un pseudo)
    throw new AccountError('Le compte attend une confirmation par e-mail : il faut couper « Confirm email » dans Supabase.');
  }
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
    userId: data.user.id,
    pseudo: data.user.user_metadata?.pseudo ?? fallbackPseudo,
  };
}

export async function signUp(pseudo: string, password: string): Promise<Session> {
  const data = await call<AuthResponse>('/auth/v1/signup', { method: 'POST', body: { email: emailOf(pseudo), password, data: { pseudo } } });
  return toSession(data, pseudo);
}

export async function signIn(pseudo: string, password: string): Promise<Session> {
  const data = await call<AuthResponse>('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: emailOf(pseudo), password } });
  return toSession(data, pseudo);
}

export async function refresh(session: Session): Promise<Session> {
  const data = await call<AuthResponse>('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: session.refreshToken } });
  return toSession(data, session.pseudo);
}

export async function signOut(session: Session): Promise<void> {
  await call('/auth/v1/logout', { method: 'POST', token: session.accessToken }).catch(() => undefined);
}

export async function loadSave(session: Session): Promise<{ data: unknown; updatedAt: string } | null> {
  const rows = await call<Array<{ data: unknown; updated_at: string }>>(`/rest/v1/saves?select=data,updated_at&user_id=eq.${session.userId}`, {
    token: session.accessToken,
  });
  return rows[0] ? { data: rows[0].data, updatedAt: rows[0].updated_at } : null;
}

export async function storeSave(session: Session, data: unknown, keepalive = false): Promise<void> {
  await call('/rest/v1/saves?on_conflict=user_id', {
    method: 'POST',
    token: session.accessToken,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { user_id: session.userId, data, updated_at: new Date().toISOString() },
    keepalive,
  });
}

export async function storeProfile(session: Session, favorites: CardFace[], avatar: string): Promise<void> {
  const send = (extra: Record<string, unknown>) =>
    call('/rest/v1/profiles?on_conflict=id', {
      method: 'POST',
      token: session.accessToken,
      prefer: 'resolution=merge-duplicates,return=minimal',
      body: { id: session.userId, pseudo: session.pseudo, favorites, updated_at: new Date().toISOString(), ...extra },
    });
  try {
    await send({ avatar });
  } catch {
    // base créée avant la photo de profil (colonne « avatar » absente) : le reste du profil part quand même
    await send({});
  }
}

/** Le profil public d'un joueur, d'après son pseudo (sans tenir compte des majuscules). */
export async function findProfile(pseudo: string): Promise<PublicProfile | null> {
  if (pseudoProblem(pseudo)) return null;
  // ilike ignore les majuscules ; « _ » y est un joker, d'où la vérification exacte ensuite
  const rows = await call<ProfileRow[]>(
    `/rest/v1/profiles?select=*&pseudo=ilike.${encodeURIComponent(pseudo)}&limit=10`,
  );
  const row = rows.find((r) => r.pseudo.toLowerCase() === pseudo.toLowerCase());
  return row ? toProfile(row) : null;
}

interface ProfileRow {
  id: string;
  pseudo: string;
  favorites: CardFace[];
  avatar?: string | null;
  updated_at: string;
}

const toProfile = (row: ProfileRow): PublicProfile => ({
  id: row.id,
  pseudo: row.pseudo,
  avatar: row.avatar ?? '',
  // une vitrine enregistrée avant le remplacement d'une espèce (ou d'une finition retirée) montre la carte d'aujourd'hui
  favorites: Array.isArray(row.favorites) ? row.favorites.map((f) => (f ? currentFace(f) : f)) : [],
  updatedAt: row.updated_at,
});

/** Profils publics de plusieurs comptes. */
export async function profilesByIds(ids: string[]): Promise<PublicProfile[]> {
  if (!ids.length) return [];
  const rows = await call<ProfileRow[]>(`/rest/v1/profiles?select=*&id=in.(${ids.join(',')})`);
  return rows.map(toProfile);
}

// ───────────── Amis ─────────────
// Table friendships : une demande (pending) de from_id à to_id, qui devient une amitié (accepted) quand to_id
// l'accepte. Chacun ne voit que les lignes qui le concernent (règles dans supabase/schema.sql).

export interface Friendship {
  fromId: string;
  toId: string;
  status: 'pending' | 'accepted';
}

export async function listFriendships(session: Session): Promise<Friendship[]> {
  const me = session.userId;
  const rows = await call<Array<{ from_id: string; to_id: string; status: 'pending' | 'accepted' }>>(
    `/rest/v1/friendships?select=from_id,to_id,status&or=(from_id.eq.${me},to_id.eq.${me})`,
    { token: session.accessToken },
  );
  return rows.map((r) => ({ fromId: r.from_id, toId: r.to_id, status: r.status }));
}

export async function sendFriendRequest(session: Session, toId: string): Promise<void> {
  await call('/rest/v1/friendships', {
    method: 'POST',
    token: session.accessToken,
    prefer: 'return=minimal',
    body: { from_id: session.userId, to_id: toId, status: 'pending' },
  });
}

export async function acceptFriendRequest(session: Session, fromId: string): Promise<void> {
  await call(`/rest/v1/friendships?from_id=eq.${fromId}&to_id=eq.${session.userId}`, {
    method: 'PATCH',
    token: session.accessToken,
    prefer: 'return=minimal',
    body: { status: 'accepted' },
  });
}

/** Retire une amitié, refuse une demande reçue ou annule une demande envoyée. */
export async function deleteFriendship(session: Session, fromId: string, toId: string): Promise<void> {
  await call(`/rest/v1/friendships?from_id=eq.${fromId}&to_id=eq.${toId}`, {
    method: 'DELETE',
    token: session.accessToken,
    prefer: 'return=minimal',
  });
}
