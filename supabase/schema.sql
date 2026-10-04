-- AnimalCards : comptes des joueurs et sauvegardes. À coller dans Supabase → SQL Editor → New query → Run.

-- Profil public de chaque joueur : son pseudo et ses 5 cartes préférées.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  pseudo text not null check (pseudo ~ '^[A-Za-z0-9_-]{3,20}$'),
  favorites jsonb not null default '[]'::jsonb,
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
