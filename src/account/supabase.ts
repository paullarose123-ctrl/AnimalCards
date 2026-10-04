import type { CardFace } from '../engine/types';
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
  pseudo: string;
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

async function call<T>(path: string, { method = 'GET', body, token, prefer, keepalive }: Options = {}): Promise<T> {
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

export async function storeProfile(session: Session, favorites: CardFace[]): Promise<void> {
  await call('/rest/v1/profiles?on_conflict=id', {
    method: 'POST',
    token: session.accessToken,
    prefer: 'resolution=merge-duplicates,return=minimal',
    body: { id: session.userId, pseudo: session.pseudo, favorites, updated_at: new Date().toISOString() },
  });
}

/** Le profil public d'un joueur, d'après son pseudo (sans tenir compte des majuscules). */
export async function findProfile(pseudo: string): Promise<PublicProfile | null> {
  if (pseudoProblem(pseudo)) return null;
  // ilike ignore les majuscules ; « _ » y est un joker, d'où la vérification exacte ensuite
  const rows = await call<Array<{ pseudo: string; favorites: CardFace[]; updated_at: string }>>(
    `/rest/v1/profiles?select=pseudo,favorites,updated_at&pseudo=ilike.${encodeURIComponent(pseudo)}&limit=10`,
  );
  const row = rows.find((r) => r.pseudo.toLowerCase() === pseudo.toLowerCase());
  return row ? { pseudo: row.pseudo, favorites: Array.isArray(row.favorites) ? row.favorites : [], updatedAt: row.updated_at } : null;
}
