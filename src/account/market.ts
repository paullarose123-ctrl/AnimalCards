import type { CardFace } from '../engine/types';
import { call, type Session } from './supabase';

// Marché en ligne entre joueurs (table market_listings et fonctions market_* de supabase/schema.sql).
// Annonces à prix fixe : le serveur garantit qu'une carte n'est vendue qu'une fois. Les graines et les cartes
// restent dans la partie de chaque joueur : l'acheteur reçoit la carte et le vendeur ses graines quand leur jeu
// voit la vente, puis le confirme (market_done) pour ne jamais les recevoir deux fois.

export type OnlineStatus = 'active' | 'sold' | 'cancelled';

export interface OnlineListing {
  id: string;
  sellerId: string;
  seller: string;
  card: CardFace;
  price: number;
  status: OnlineStatus;
  buyerId: string | null;
  buyer: string | null;
  createdAt: number;
  expiresAt: number;
  soldAt: number | null;
  buyerDone: boolean;
  sellerDone: boolean;
}

interface Row {
  id: string;
  seller_id: string;
  seller_pseudo: string;
  card: CardFace;
  price: number;
  status: OnlineStatus;
  buyer_id: string | null;
  buyer_pseudo: string | null;
  created_at: string;
  expires_at: string;
  sold_at: string | null;
  buyer_done: boolean;
  seller_done: boolean;
}

const toListing = (r: Row): OnlineListing => ({
  id: r.id,
  sellerId: r.seller_id,
  seller: r.seller_pseudo,
  card: { athleteId: r.card.athleteId, variant: r.card.variant },
  price: Number(r.price),
  status: r.status,
  buyerId: r.buyer_id,
  buyer: r.buyer_pseudo,
  createdAt: Date.parse(r.created_at),
  expiresAt: Date.parse(r.expires_at),
  soldAt: r.sold_at ? Date.parse(r.sold_at) : null,
  buyerDone: r.buyer_done,
  sellerDone: r.seller_done,
});

/** Annonces en cours de tous les joueurs (les plus récentes d'abord). */
export async function fetchActive(token?: string): Promise<OnlineListing[]> {
  const now = new Date().toISOString();
  const rows = await call<Row[]>(`/rest/v1/market_listings?select=*&status=eq.active&expires_at=gt.${encodeURIComponent(now)}&order=created_at.desc&limit=300`, { token });
  return rows.map(toListing);
}

/** Mes annonces et mes achats qui ne sont pas encore réglés dans ma partie. */
export async function fetchMine(session: Session): Promise<OnlineListing[]> {
  const me = session.userId;
  const rows = await call<Row[]>(
    `/rest/v1/market_listings?select=*&or=(and(seller_id.eq.${me},seller_done.eq.false),and(buyer_id.eq.${me},buyer_done.eq.false))&order=created_at.desc&limit=200`,
    { token: session.accessToken },
  );
  return rows.map(toListing);
}

/** Mes dernières ventes et achats terminés (historique). */
export async function fetchHistory(session: Session): Promise<OnlineListing[]> {
  const me = session.userId;
  const rows = await call<Row[]>(`/rest/v1/market_listings?select=*&status=eq.sold&or=(seller_id.eq.${me},buyer_id.eq.${me})&order=sold_at.desc&limit=30`, {
    token: session.accessToken,
  });
  return rows.map(toListing);
}

const rpc = <T>(session: Session, name: string, body: Record<string, unknown>) =>
  call<T>(`/rest/v1/rpc/${name}`, { method: 'POST', token: session.accessToken, body });

export async function listOnline(session: Session, card: CardFace, price: number, hours: number): Promise<OnlineListing> {
  return toListing(await rpc<Row>(session, 'market_list', { p_card: { athleteId: card.athleteId, variant: card.variant }, p_price: price, p_hours: hours }));
}

export async function buyOnline(session: Session, id: string): Promise<OnlineListing> {
  return toListing(await rpc<Row>(session, 'market_buy', { p_id: id }));
}

export async function cancelOnline(session: Session, id: string): Promise<OnlineListing> {
  return toListing(await rpc<Row>(session, 'market_cancel', { p_id: id }));
}

export async function markDone(session: Session, id: string): Promise<void> {
  await rpc<null>(session, 'market_done', { p_id: id });
}
