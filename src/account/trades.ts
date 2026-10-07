import type { CardFace } from '../engine/types';
import { currentAthleteId } from '../data/remplacements';
import { currentFace } from '../engine/cards';
import { call, type Session } from './supabase';

// Échanges de cartes entre amis (table trades et fonctions trade_* de supabase/schema.sql).
// Le joueur propose une de ses cartes contre une espèce de même rareté ; son ami accepte en donnant un exemplaire,
// ou refuse. Chacun règle l'échange dans sa partie puis le confirme (trade_done).

export type TradeStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';

export interface Trade {
  id: string;
  fromId: string;
  from: string;
  toId: string;
  to: string;
  offer: CardFace;
  /** espèce demandée (n'importe quelle finition) */
  wantId: string;
  /** exemplaire donné par l'ami à l'acceptation */
  given: CardFace | null;
  status: TradeStatus;
  createdAt: number;
  updatedAt: number;
  fromDone: boolean;
  toDone: boolean;
}

interface Row {
  id: string;
  from_id: string;
  from_pseudo: string;
  to_id: string;
  to_pseudo: string;
  offer: CardFace;
  want: { athleteId: string };
  given: CardFace | null;
  status: TradeStatus;
  created_at: string;
  updated_at: string;
  from_done: boolean;
  to_done: boolean;
}

// une carte enregistrée avant le remplacement d'une espèce (ou d'une finition retirée) devient la carte d'aujourd'hui
const face = (c: CardFace): CardFace => currentFace({ athleteId: c.athleteId, variant: c.variant });

const toTrade = (r: Row): Trade => ({
  id: r.id,
  fromId: r.from_id,
  from: r.from_pseudo,
  toId: r.to_id,
  to: r.to_pseudo,
  offer: face(r.offer),
  wantId: currentAthleteId(r.want.athleteId),
  given: r.given ? face(r.given) : null,
  status: r.status,
  createdAt: Date.parse(r.created_at),
  updatedAt: Date.parse(r.updated_at),
  fromDone: r.from_done,
  toDone: r.to_done,
});

/** Mes échanges récents (proposés et reçus). */
export async function fetchTrades(session: Session): Promise<Trade[]> {
  const me = session.userId;
  const rows = await call<Row[]>(`/rest/v1/trades?select=*&or=(from_id.eq.${me},to_id.eq.${me})&order=updated_at.desc&limit=60`, {
    token: session.accessToken,
  });
  return rows.map(toTrade);
}

const rpc = (session: Session, name: string, body: Record<string, unknown>) =>
  call<Row | null>(`/rest/v1/rpc/${name}`, { method: 'POST', token: session.accessToken, body });

export async function proposeTrade(session: Session, toId: string, offer: CardFace, wantId: string): Promise<Trade> {
  return toTrade((await rpc(session, 'trade_propose', { p_to: toId, p_offer: face(offer), p_want: { athleteId: wantId } }))!);
}

export async function acceptTrade(session: Session, id: string, given: CardFace): Promise<Trade> {
  return toTrade((await rpc(session, 'trade_accept', { p_id: id, p_given: face(given) }))!);
}

export async function declineTrade(session: Session, id: string): Promise<Trade> {
  return toTrade((await rpc(session, 'trade_decline', { p_id: id }))!);
}

export async function cancelTrade(session: Session, id: string): Promise<Trade> {
  return toTrade((await rpc(session, 'trade_cancel', { p_id: id }))!);
}

export async function tradeDone(session: Session, id: string): Promise<void> {
  await rpc(session, 'trade_done', { p_id: id });
}
