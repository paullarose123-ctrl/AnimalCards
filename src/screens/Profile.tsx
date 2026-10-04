import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { FAVORITES_SIZE, useGame } from '../store/game';
import { useAccount } from '../store/account';
import { useUi } from '../store/ui';
import { useNow } from '../hooks/useNow';
import { ATHLETES_BY_ID } from '../data/athletes';
import { displayName, rarityOf } from '../engine/cards';
import type { CardFace, OwnedCard } from '../engine/types';
import { MIN_PASSWORD, accountsEnabled, pseudoProblem, type PublicProfile } from '../account/supabase';
import { Card } from '../components/Card';
import { Avatar } from '../components/Avatar';
import { photoCredit } from '../photos';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';

// Écran Profil : le compte du joueur (création, connexion, sauvegarde), sa vitrine de cartes préférées,
// et ses amis (demandes d'ami à accepter) : leur photo, leur vitrine et un duel contre elle.

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

/** Un ami : sa photo, son pseudo, sa vitrine (à déplier), et un défi en duel contre les animaux de sa vitrine. */
function FriendRow({ profile, onRemove }: { profile: PublicProfile; onRemove: () => void }) {
  const startMatch = useGame((s) => s.startMatch);
  const match = useGame((s) => s.match);
  const setTab = useUi((s) => s.setTab);
  const [open, setOpen] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const faces: CardFace[] = profile.favorites.filter((face) => ATHLETES_BY_ID[face?.athleteId]).slice(0, FAVORITES_SIZE);
  const challenge = () => {
    if (match) {
      setTab('matchs');
      return;
    }
    if (startMatch({ pseudo: profile.pseudo, cards: faces })) setTab('matchs');
  };

  return (
    <li className="friend">
      <div className="friend__head">
        <Avatar athleteId={profile.avatar} pseudo={profile.pseudo} className="avatar--player" />
        <div className="friend__who">
          <b>{profile.pseudo}</b>
          <span className="muted small">
            {faces.length} carte{faces.length > 1 ? 's' : ''} dans sa vitrine
          </span>
        </div>
        <div className="friend__actions">
          {faces.length > 0 && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              {open ? 'Cacher' : 'Sa vitrine'}
            </button>
          )}
          <button type="button" className="btn btn--primary btn--sm" onClick={challenge} title="Un duel contre les animaux de sa vitrine (complétée au hasard)">
            {match ? 'Duel en cours' : 'Défier'}
          </button>
          {confirmRemove ? (
            <button type="button" className="btn btn--danger btn--sm" onClick={onRemove}>
              Retirer ?
            </button>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmRemove(true)} aria-label={`Retirer ${profile.pseudo} de mes amis`}>
              ×
            </button>
          )}
        </div>
      </div>
      {open && faces.length > 0 && (
        <div className="vitrine vitrine--public">
          {faces.map((face, i) => (
            <Card key={i} card={face} size="sm" />
          ))}
        </div>
      )}
    </li>
  );
}

/** Demande d'ami reçue ou envoyée : le joueur et les boutons pour répondre ou annuler. */
function RequestRow({ profile, received, onAccept, onRemove }: { profile?: PublicProfile; received: boolean; onAccept: () => void; onRemove: () => void }) {
  const pseudo = profile?.pseudo ?? 'Joueur';
  return (
    <li className="friend">
      <div className="friend__head">
        <Avatar athleteId={profile?.avatar} pseudo={pseudo} className="avatar--player" />
        <div className="friend__who">
          <b>{pseudo}</b>
          <span className="muted small">{received ? 'veut être ton ami' : 'n’a pas encore répondu'}</span>
        </div>
        <div className="friend__actions">
          {received ? (
            <>
              <button type="button" className="btn btn--primary btn--sm" onClick={onAccept}>
                Accepter
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
                Refuser
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--ghost btn--sm" onClick={onRemove}>
              Annuler
            </button>
          )}
        </div>
      </div>
    </li>
  );
}

function Friends() {
  const session = useAccount((s) => s.session);
  const friendships = useAccount((s) => s.friendships);
  const profiles = useAccount((s) => s.friendProfiles);
  const error = useAccount((s) => s.friendsError);
  const refreshFriends = useAccount((s) => s.refreshFriends);
  const requestFriend = useAccount((s) => s.requestFriend);
  const acceptFriend = useAccount((s) => s.acceptFriend);
  const removeFriend = useAccount((s) => s.removeFriend);
  const [pseudo, setPseudo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (session) void refreshFriends();
  }, [session, refreshFriends]);

  if (!session) {
    return (
      <section className="panel">
        <h2>Mes amis</h2>
        <p className="muted">Crée ton compte ou connecte-toi pour envoyer des demandes d’ami.</p>
      </section>
    );
  }

  const me = session.userId;
  const other = (f: { fromId: string; toId: string }) => (f.fromId === me ? f.toId : f.fromId);
  const received = friendships.filter((f) => f.status === 'pending' && f.toId === me);
  const sent = friendships.filter((f) => f.status === 'pending' && f.fromId === me);
  const friends = friendships.filter((f) => f.status === 'accepted' && profiles[other(f)]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    const name = pseudo.trim();
    if (!name) return;
    setBusy(true);
    setMessage(null);
    const result = await requestFriend(name);
    setMessage(result);
    if (result.ok) setPseudo('');
    setBusy(false);
  };

  return (
    <section className="panel">
      <h2>
        Mes amis <small>· {friends.length}</small>
      </h2>
      <p className="muted small">Envoie une demande d’ami avec un pseudo. Une fois acceptée, tu vois sa photo et sa vitrine, et tu peux le défier en duel.</p>
      <form className="search-player" onSubmit={add}>
        <label className="field field--grow">
          <span className="visually-hidden">Pseudo de l’ami</span>
          <input value={pseudo} onChange={(e) => setPseudo(e.target.value)} placeholder="Pseudo de ton ami" autoCapitalize="none" spellCheck={false} maxLength={20} />
        </label>
        <button type="submit" className="btn btn--primary" disabled={busy}>
          Envoyer une demande
        </button>
      </form>
      {message && <p className={message.ok ? 'muted' : 'account__error'}>{message.text}</p>}
      {error && <p className="account__error">{error}</p>}

      {received.length > 0 && (
        <>
          <h3 className="friends__title">Demandes reçues</h3>
          <ul className="friends">
            {received.map((f) => (
              <RequestRow key={f.fromId} profile={profiles[f.fromId]} received onAccept={() => void acceptFriend(f.fromId)} onRemove={() => void removeFriend(f.fromId, f.toId)} />
            ))}
          </ul>
        </>
      )}

      {friends.length > 0 ? (
        <ul className="friends">
          {friends.map((f) => (
            <FriendRow key={other(f)} profile={profiles[other(f)]} onRemove={() => void removeFriend(f.fromId, f.toId)} />
          ))}
        </ul>
      ) : (
        <p className="muted">Pas encore d’amis : demande leur pseudo à tes copains !</p>
      )}

      {sent.length > 0 && (
        <>
          <h3 className="friends__title">Demandes envoyées</h3>
          <ul className="friends">
            {sent.map((f) => (
              <RequestRow key={f.toId} profile={profiles[f.toId]} received={false} onAccept={() => undefined} onRemove={() => void removeFriend(f.fromId, f.toId)} />
            ))}
          </ul>
        </>
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
      {enabled && <Friends />}
    </div>
  );
}
