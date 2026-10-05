-- AnimalCards : comptes des joueurs et sauvegardes. À coller dans Supabase → SQL Editor → New query → Run.

-- Profil public de chaque joueur : son pseudo et ses 5 cartes préférées.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_-]{3,20}$'),
  favorites jsonb not null default '[]'::jsonb,
  -- photo de profil : identifiant de l'espèce choisie
  avatar text,
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_pseudo_unique on public.profiles (lower(pseudo));

-- Sauvegarde privée de la partie : toute la progression du joueur.
create table if not exists public.saves (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

drop policy if exists "Profils visibles par tous" on public.profiles;
create policy "Profils visibles par tous" on public.profiles for select using (true);
drop policy if exists "Chacun crée son profil" on public.profiles;
create policy "Chacun crée son profil" on public.profiles for insert with check ((select auth.uid()) = id);
drop policy if exists "Chacun modifie son profil" on public.profiles;
create policy "Chacun modifie son profil" on public.profiles for update using ((select auth.uid()) = id);

drop policy if exists "Chacun lit sa sauvegarde" on public.saves;
create policy "Chacun lit sa sauvegarde" on public.saves for select using ((select auth.uid()) = user_id);
drop policy if exists "Chacun crée sa sauvegarde" on public.saves;
create policy "Chacun crée sa sauvegarde" on public.saves for insert with check ((select auth.uid()) = user_id);
drop policy if exists "Chacun modifie sa sauvegarde" on public.saves;
create policy "Chacun modifie sa sauvegarde" on public.saves for update using ((select auth.uid()) = user_id);

grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.saves to authenticated;

-- Mise à jour pour une base créée avant la photo de profil :
alter table public.profiles add column if not exists avatar text;

-- Amis : une demande (pending) envoyée par from_id à to_id, qui devient une amitié (accepted) quand to_id l'accepte.
create table if not exists public.friendships (
  from_id uuid not null references auth.users (id) on delete cascade,
  to_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (from_id, to_id),
  check (from_id <> to_id)
);
alter table public.friendships enable row level security;
drop policy if exists "Voir ses demandes et ses amis" on public.friendships;
create policy "Voir ses demandes et ses amis" on public.friendships for select using ((select auth.uid()) in (from_id, to_id));
drop policy if exists "Envoyer une demande" on public.friendships;
create policy "Envoyer une demande" on public.friendships for insert with check ((select auth.uid()) = from_id and status = 'pending');
drop policy if exists "Accepter une demande reçue" on public.friendships;
create policy "Accepter une demande reçue" on public.friendships for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id and status = 'accepted');
drop policy if exists "Retirer un ami ou une demande" on public.friendships;
create policy "Retirer un ami ou une demande" on public.friendships for delete using ((select auth.uid()) in (from_id, to_id));
grant select, insert, update, delete on public.friendships to authenticated;

-- ───────────── Marché en ligne entre joueurs ─────────────
-- Une annonce = une carte mise en vente à prix fixe par un joueur. Toutes les écritures passent par les fonctions
-- ci-dessous (security definer) : une carte ne peut être achetée qu'une seule fois, jamais par son vendeur,
-- et seul le vendeur peut la retirer. Les joueurs ne peuvent pas modifier les lignes directement.
create table if not exists public.market_listings (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  seller_pseudo text not null,
  card jsonb not null,
  price bigint not null check (price between 10 and 100000000),
  status text not null default 'active' check (status in ('active', 'sold', 'cancelled')),
  buyer_id uuid references auth.users (id) on delete set null,
  buyer_pseudo text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  sold_at timestamptz,
  -- la carte a été livrée à l'acheteur / les graines versées au vendeur / la carte rendue au vendeur
  buyer_done boolean not null default false,
  seller_done boolean not null default false
);
create index if not exists market_active on public.market_listings (status, expires_at);
create index if not exists market_seller on public.market_listings (seller_id);
create index if not exists market_buyer on public.market_listings (buyer_id);

alter table public.market_listings enable row level security;
drop policy if exists "Annonces visibles" on public.market_listings;
create policy "Annonces visibles" on public.market_listings for select
  using (status = 'active' or (select auth.uid()) in (seller_id, buyer_id));
grant select on public.market_listings to anon, authenticated;

-- Mettre une carte en vente (15 annonces actives au plus par joueur).
create or replace function public.market_list(p_card jsonb, p_price bigint, p_hours int)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_name text;
  r public.market_listings;
begin
  if me is null then raise exception 'non connecté'; end if;
  if p_hours not in (1, 6, 24, 72) then raise exception 'durée invalide'; end if;
  if jsonb_typeof(p_card -> 'athleteId') <> 'string' or coalesce(p_card ->> 'variant', '') not in ('base', 'reverse', 'prime') then
    raise exception 'carte invalide';
  end if;
  select pseudo into v_name from profiles where id = me;
  if v_name is null then raise exception 'profil manquant'; end if;
  if (select count(*) from market_listings where seller_id = me and status = 'active') >= 15 then
    raise exception 'trop d''annonces';
  end if;
  insert into market_listings (seller_id, seller_pseudo, card, price, expires_at)
  values (me, v_name, jsonb_build_object('athleteId', p_card ->> 'athleteId', 'variant', p_card ->> 'variant'), p_price, now() + make_interval(hours => p_hours))
  returning * into r;
  return r;
end $$;

-- Acheter : réussit pour un seul acheteur, et jamais sa propre carte ni une annonce expirée.
create or replace function public.market_buy(p_id uuid)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  me uuid := auth.uid();
  v_name text;
  r public.market_listings;
begin
  if me is null then raise exception 'non connecté'; end if;
  select pseudo into v_name from profiles where id = me;
  update market_listings
     set status = 'sold', buyer_id = me, buyer_pseudo = coalesce(v_name, 'Un joueur'), sold_at = now()
   where id = p_id and status = 'active' and expires_at > now() and seller_id <> me
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

-- Retirer son annonce (ou récupérer une annonce expirée).
create or replace function public.market_cancel(p_id uuid)
returns public.market_listings language plpgsql security definer set search_path = public as $$
declare
  r public.market_listings;
begin
  update market_listings set status = 'cancelled'
   where id = p_id and status = 'active' and seller_id = auth.uid()
  returning * into r;
  if r.id is null then raise exception 'indisponible'; end if;
  return r;
end $$;

-- Confirmer que la carte (acheteur) ou les graines / la carte rendue (vendeur) sont arrivées dans la partie.
create or replace function public.market_done(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update market_listings set buyer_done = true where id = p_id and buyer_id = auth.uid();
  update market_listings set seller_done = true where id = p_id and seller_id = auth.uid() and status <> 'active';
end $$;

revoke all on function public.market_list(jsonb, bigint, int) from public, anon;
revoke all on function public.market_buy(uuid) from public, anon;
revoke all on function public.market_cancel(uuid) from public, anon;
revoke all on function public.market_done(uuid) from public, anon;
grant execute on function public.market_list(jsonb, bigint, int) to authenticated;
grant execute on function public.market_buy(uuid) to authenticated;
grant execute on function public.market_cancel(uuid) to authenticated;
grant execute on function public.market_done(uuid) to authenticated;

-- l'API de Supabase relit la base pour voir la nouvelle table et les nouvelles fonctions
notify pgrst, 'reload schema';
