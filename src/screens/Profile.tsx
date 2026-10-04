import { useMemo, useState, type FormEvent } from 'react';
import { FAVORITES_SIZE, useGame } from '../store/game';
import { useAccount } from '../store/account';
import { useUi } from '../store/ui';
import { useNow } from '../hooks/useNow';
import { ATHLETES_BY_ID } from '../data/athletes';
import { displayName, rarityOf } from '../engine/cards';
import type { CardFace, OwnedCard } from '../engine/types';
import { MIN_PASSWORD, accountsEnabled, findProfile, pseudoProblem, type PublicProfile } from '../account/supabase';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { photoCredit } from '../photos';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';

// Écran Profil : le compte du joueur (création, connexion, sauvegarde), sa vitrine de cartes préférées,
// et la vitrine des autres joueurs, retrouvés par leur pseudo.

function normalize(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** « à l’instant », « il y a 3 min », « il y a 2 h »… */
function ago(time: number, now: number): string {
  const s = Math.max(0, Math.round((now - time) / 1000));
  if (s < 45) return 'à l’instant';
  const min = Math.round(s / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} jours`;
}

function AccountForm() {
  const register = useAccount((s) => s.register);
  const login = useAccount((s) => s.login);
  const busy = useAccount((s) => s.busy);
  const serverError = useAccount((s) => s.error);
  const packsOpened = useGame((s) => s.stats.packsOpened);
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [pseudo, setPseudo] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [problem, setProblem] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const name = pseudo.trim();
    const issue =
      pseudoProblem(name) ??
      (password.length < MIN_PASSWORD ? `Ton mot de passe doit faire au moins ${MIN_PASSWORD} caractères.` : null) ??
      (mode === 'register' && password !== confirm ? 'Les deux mots de passe ne sont pas pareils.' : null);
    setProblem(issue);
    if (issue) return;
    const ok = mode === 'register' ? await register(name, password) : await login(name, password);
    if (ok) {
      setPassword('');
      setConfirm('');
    }
  };

  const error = problem ?? serverError;
  return (
    <section className="panel account">
      <h2>{mode === 'register' ? 'Crée ton compte' : 'Connecte-toi'}</h2>
      <p className="muted">
        {mode === 'register'
          ? packsOpened > 0
            ? 'Choisis un pseudo et un mot de passe : ta progression actuelle sera gardée dans ton compte, et tu la retrouveras sur n’importe quel appareil.'
            : 'Choisis un pseudo et un mot de passe : ta progression sera sauvegardée, et tu la retrouveras sur n’importe quel appareil.'
          : 'La partie de ce navigateur sera remplacée par celle de ton compte.'}
      </p>
      <div className="segmented account__modes" role="tablist" aria-label="Compte">
        <button type="button" role="tab" aria-selected={mode === 'register'} className={mode === 'register' ? 'is-active' : ''} onClick={() => setMode('register')}>
          Nouveau compte
        </button>
        <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
          J’ai déjà un compte
        </button>
      </div>
      <form className="account__form" onSubmit={submit} noValidate>
        <label className="field">
          <span>Pseudo</span>
          <input
            value={pseudo}
            onChange={(e) => setPseudo(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            placeholder="ex. Explorateur_42"
          />
        </label>
        <label className="field">
          <span>Mot de passe</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            placeholder={`${MIN_PASSWORD} caractères minimum`}
          />
        </label>
        {mode === 'register' && (
          <label className="field">
            <span>Encore le mot de passe</span>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </label>
        )}
        {error && (
          <p className="account__error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy}>
          {busy ? 'Un instant…' : mode === 'register' ? 'Créer mon compte' : 'Me connecter'}
        </button>
        {mode === 'register' && <p className="muted small">Retiens bien ton mot de passe : sans adresse e-mail, il ne peut pas être récupéré.</p>}
      </form>
    </section>
  );
}

function AccountStatus() {
  const session = useAccount((s) => s.session)!;
  const status = useAccount((s) => s.status);
  const lastSavedAt = useAccount((s) => s.lastSavedAt);
  const error = useAccount((s) => s.error);
  const busy = useAccount((s) => s.busy);
  const saveNow = useAccount((s) => s.saveNow);
  const logout = useAccount((s) => s.logout);
  const now = useNow(15_000);
  const [confirmLogout, setConfirmLogout] = useState(false);

  return (
    <section className="panel account">
      <h2>Mon compte</h2>
      <p>
        Connecté en tant que <b>{session.pseudo}</b>.
      </p>
      <p className={`account__sync account__sync--${status}`} aria-live="polite">
        <i aria-hidden="true" />
        {status === 'saving'
          ? 'Sauvegarde en cours…'
          : status === 'error'
            ? `Sauvegarde en attente : ${error ?? 'le serveur ne répond pas'}`
            : lastSavedAt
              ? `Progression sauvegardée ${ago(lastSavedAt, now)}`
              : 'Ta progression se sauvegarde toute seule.'}
      </p>
      <div className="btn-row">
        <button type="button" className="btn btn--ghost" onClick={() => void saveNow()} disabled={status === 'saving'}>
          Sauvegarder maintenant
        </button>
        {confirmLogout ? (
          <>
            <button type="button" className="btn btn--danger" onClick={() => void logout()} disabled={busy}>
              Oui, me déconnecter
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setConfirmLogout(false)}>
              Annuler
            </button>
          </>
        ) : (
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmLogout(true)}>
            Se déconnecter
          </button>
        )}
      </div>
      {confirmLogout && <p className="muted small">Ta progression part avec ton compte : ce navigateur repartira d’une partie neuve.</p>}
    </section>
  );
}

/** Choix d'une carte de la réserve pour un emplacement de la vitrine. */
function Picker({ slot, onClose }: { slot: number; onClose: () => void }) {
  const collection = useGame((s) => s.collection);
  const setFavorite = useGame((s) => s.setFavorite);
  const [query, setQuery] = useState('');
  const cards = useMemo(() => {
    // une carte par espèce et finition, la plus rare d'abord
    const seen = new Map<string, OwnedCard>();
    for (const card of collection) {
      const key = `${card.athleteId}:${card.variant}`;
      if (!seen.has(key)) seen.set(key, card);
    }
    const q = normalize(query.trim());
    const finish = (c: OwnedCard) => (c.variant === 'prime' ? 2 : c.variant === 'reverse' ? 1 : 0);
    return [...seen.values()]
      .filter((card) => !q || normalize(displayName(ATHLETES_BY_ID[card.athleteId])).includes(q))
      .sort((a, b) => {
        const ra = rarityOf(ATHLETES_BY_ID[a.athleteId]).order;
        const rb = rarityOf(ATHLETES_BY_ID[b.athleteId]).order;
        return rb - ra || finish(b) - finish(a) || ATHLETES_BY_ID[a.athleteId].last.localeCompare(ATHLETES_BY_ID[b.athleteId].last, 'fr');
      });
  }, [collection, query]);

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="picker-title" onClick={onClose}>
      <div className="modal__panel picker" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2 id="picker-title">Choisis une carte pour ta vitrine</h2>
        <label className="field">
          <span className="visually-hidden">Chercher</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher une espèce…" autoFocus />
        </label>
        {cards.length ? (
          <div className="picker__grid">
            {cards.slice(0, 160).map((card) => (
              <Card
                key={card.uid}
                card={card}
                size="xs"
                onClick={() => {
                  setFavorite(slot, card.uid);
                  onClose();
                }}
              />
            ))}
          </div>
        ) : (
          <p className="muted">{collection.length ? 'Aucune carte ne correspond.' : 'Ta réserve est vide : ouvre un booster pour commencer ta collection.'}</p>
        )}
      </div>
    </div>
  );
}

function Showcase() {
  const favorites = useGame((s) => s.favorites);
  const collection = useGame((s) => s.collection);
  const setFavorite = useGame((s) => s.setFavorite);
  const openDetail = useUi((s) => s.openDetail);
  const [picking, setPicking] = useState<number | null>(null);
  const byUid = useMemo(() => new Map(collection.map((card) => [card.uid, card])), [collection]);

  return (
    <section className="panel">
      <h2>
        Ma vitrine <small>· mes {FAVORITES_SIZE} cartes préférées</small>
      </h2>
      <p className="muted small">Elles s’affichent sur ton profil, que les autres joueurs peuvent voir avec ton pseudo.</p>
      <div className="vitrine">
        {Array.from({ length: FAVORITES_SIZE }, (_, slot) => {
          const card = byUid.get(favorites[slot] ?? '');
          return card ? (
            <div key={slot} className="vitrine__slot">
              <Card card={card} size="sm" onClick={() => openDetail({ card })} />
              <div className="vitrine__actions">
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setPicking(slot)}>
                  Changer
                </button>
                <button type="button" className="btn btn--ghost btn--xs" onClick={() => setFavorite(slot, null)} aria-label="Retirer de la vitrine">
                  Retirer
                </button>
              </div>
            </div>
          ) : (
            <button key={slot} type="button" className="vitrine__empty" onClick={() => setPicking(slot)}>
              <span aria-hidden="true">+</span>
              Choisir une carte
            </button>
          );
        })}
      </div>
      {picking !== null && <Picker slot={picking} onClose={() => setPicking(null)} />}
    </section>
  );
}

function PlayerSearch() {
  const [pseudo, setPseudo] = useState('');
  const [result, setResult] = useState<PublicProfile | null | 'none' | 'loading'>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const name = pseudo.trim();
    if (!name) return;
    setError(null);
    setResult('loading');
    try {
      setResult((await findProfile(name)) ?? 'none');
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Recherche impossible.');
    }
  };

  const faces: CardFace[] = result && typeof result === 'object' ? result.favorites.filter((face) => ATHLETES_BY_ID[face?.athleteId]).slice(0, FAVORITES_SIZE) : [];
  return (
    <section className="panel">
      <h2>La vitrine d’un autre joueur</h2>
      <form className="search-player" onSubmit={search}>
        <label className="field field--grow">
          <span className="visually-hidden">Pseudo du joueur</span>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Pseudo du joueur" autoCapitalize="none" spellCheck={false} maxLength={20} />
        </label>
        <button type="submit" className="btn btn--primary" disabled={result === 'loading'}>
          Voir
        </button>
      </form>
      {error && <p className="account__error">{error}</p>}
      {result === 'none' && <p className="muted">Aucun joueur ne porte ce pseudo.</p>}
      {result && typeof result === 'object' && (
        <div className="player">
          <div className="player__head">
            <Avatar athleteId={result.avatar} pseudo={result.pseudo} className="avatar--player" />
            <h3>{result.pseudo}</h3>
          </div>
          {faces.length ? (
            <div className="vitrine vitrine--public">
              {faces.map((face, i) => (
                <Card key={i} card={face} size="sm" />
              ))}
            </div>
          ) : (
            <p className="muted">Sa vitrine est encore vide.</p>
          )}
        </div>
      )}
    </section>
  );
}

/** Choix de la photo de profil : la photo d'un des animaux découverts. */
function AvatarPicker({ onClose }: { onClose: () => void }) {
  const discovered = useGame((s) => s.discovered);
  const avatar = useGame((s) => s.avatar);
  const pseudo = useAccount((s) => s.session?.pseudo);
  const setAvatar = useGame((s) => s.setAvatar);
  const [query, setQuery] = useState('');
  const choices = useMemo(() => {
    const q = normalize(query.trim());
    return Object.keys(discovered)
      .map((id) => ATHLETES_BY_ID[id])
      .filter((a) => a && photoCredit(a.id) && (!q || normalize(a.last).includes(q)))
      .sort((a, b) => a.last.localeCompare(b.last, 'fr'));
  }, [discovered, query]);
  const choose = (id: string) => {
    setAvatar(id);
    onClose();
  };

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="avatar-title" onClick={onClose}>
      <div className="modal__panel picker" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="modal__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
        <h2 id="avatar-title">Choisis ta photo de profil</h2>
        <p className="muted small">Parmi les animaux que tu as découverts : plus ta collection grandit, plus tu as de choix.</p>
        <label className="field">
          <span className="visually-hidden">Chercher</span>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Chercher un animal…" />
        </label>
        <div className="avatar-grid">
          <button type="button" className={avatar ? '' : 'is-active'} onClick={() => choose('')}>
            <Avatar pseudo={pseudo} />
            Mon initiale
          </button>
          {choices.map((a) => (
            <button key={a.id} type="button" className={avatar === a.id ? 'is-active' : ''} onClick={() => choose(a.id)}>
              <Avatar athleteId={a.id} pseudo={pseudo} />
              {a.last}
            </button>
          ))}
        </div>
        {!choices.length && <p className="muted">Ouvre des boosters pour découvrir des animaux : leurs photos apparaîtront ici.</p>}
      </div>
    </div>
  );
}

export function ProfileScreen() {
  const session = useAccount((s) => s.session);
  const discovered = useGame((s) => Object.keys(s.discovered).length);
  const cards = useGame((s) => s.collection.length);
  const packs = useGame((s) => s.stats.packsOpened);
  const enabled = accountsEnabled();
  const avatar = useGame((s) => s.avatar);
  const [picking, setPicking] = useState(false);

  return (
    <div className="screen">
      <header className="screen__head screen__head--art">
        <Landscape className="screen__art" scene={SCREEN_SCENES.profil} seed="profil" />
        <div className="profile-id">
          <button type="button" className="profile-id__photo" onClick={() => setPicking(true)} aria-label="Changer ma photo de profil">
            <Avatar athleteId={avatar} pseudo={session?.pseudo} className="avatar--big" />
            <span className="profile-id__edit" aria-hidden="true">
              ✎
            </span>
          </button>
          <div>
            <p className="eyebrow">Profil</p>
            <h1>{session ? session.pseudo : 'Invité'}</h1>
            <p className="muted">
              {discovered.toLocaleString('fr-FR')} espèce{discovered > 1 ? 's' : ''} découverte{discovered > 1 ? 's' : ''} · {cards.toLocaleString('fr-FR')} carte
              {cards > 1 ? 's' : ''} · {packs.toLocaleString('fr-FR')} booster{packs > 1 ? 's' : ''} ouvert{packs > 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </header>
      {picking && <AvatarPicker onClose={() => setPicking(false)} />}
      {enabled ? (
        session ? (
          <AccountStatus />
        ) : (
          <AccountForm />
        )
      ) : (
        <section className="panel">
          <h2>Comptes : bientôt</h2>
          <p className="muted">Les comptes arrivent très vite. En attendant, ta partie est gardée dans ce navigateur.</p>
        </section>
      )}
      <Showcase />
      {enabled && <PlayerSearch />}
    </div>
  );
}
