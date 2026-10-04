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

create policy "Profils visibles par tous" on public.profiles for select using (true);
create policy "Chacun crée son profil" on public.profiles for insert with check ((select auth.uid()) = id);
create policy "Chacun modifie son profil" on public.profiles for update using ((select auth.uid()) = id);

create policy "Chacun lit sa sauvegarde" on public.saves for select using ((select auth.uid()) = user_id);
create policy "Chacun crée sa sauvegarde" on public.saves for insert with check ((select auth.uid()) = user_id);
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
create policy "Voir ses demandes et ses amis" on public.friendships for select using ((select auth.uid()) in (from_id, to_id));
create policy "Envoyer une demande" on public.friendships for insert with check ((select auth.uid()) = from_id and status = 'pending');
create policy "Accepter une demande reçue" on public.friendships for update using ((select auth.uid()) = to_id) with check ((select auth.uid()) = to_id and status = 'accepted');
create policy "Retirer un ami ou une demande" on public.friendships for delete using ((select auth.uid()) in (from_id, to_id));
grant select, insert, update, delete on public.friendships to authenticated;
