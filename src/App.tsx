import { useEffect, useRef, type ReactNode } from 'react';
import { useGame, MAX_FREE_PACKS } from './store/game';
import { useUi, type Tab } from './store/ui';
import { useNow, formatDuration } from './hooks/useNow';
import { Balles } from './components/Balles';
import { Logo, LogoMark } from './components/Logo';
import { setMuted, sfx } from './audio/sfx';
import { setMusicEnabled, startMusic } from './audio/music';
import { HomeScreen } from './screens/Home';
import { CollectionScreen } from './screens/Collection';
import { MarketScreen } from './screens/Market';
import { MatchScreen } from './screens/Match';
import { ShopScreen } from './screens/Shop';
import { ProfileScreen } from './screens/Profile';
import { useAccount } from './store/account';
import { Avatar } from './components/Avatar';
import { PackOpening } from './overlays/PackOpening';
import { CardDetail } from './overlays/CardDetail';
import { Toasts } from './components/Toasts';
import { Fireflies } from './components/Fireflies';
import { Juice } from './components/Juice';
import { useOnline } from './store/online';
import { accountsEnabled } from './account/supabase';
import { Landscape } from './components/PackScene';
import { SITE_SCENE } from './art/scenes';

const NAV: Array<{ id: Tab; label: string; icon: ReactNode }> = [
  {
    id: 'boosters',
    label: 'Boosters',
    icon: <path d="M7,3 H17 L18,5 V19 L17,21 H7 L6,19 V5 Z M9,9 H15 M9,13 H15" />,
  },
  {
    id: 'collection',
    label: 'Collection',
    icon: <path d="M8,4 H18 A1,1 0 0 1 19,5 V17 M5,7 H15 A1,1 0 0 1 16,8 V20 A1,1 0 0 1 15,21 H5 A1,1 0 0 1 4,20 V8 A1,1 0 0 1 5,7 Z" />,
  },
  {
    id: 'mercato',
    label: 'Marché',
    icon: <path d="M4,8 H18 M14,4 L18,8 L14,12 M20,16 H6 M10,12 L6,16 L10,20" />,
  },
  {
    id: 'matchs',
    label: 'Duel',
    icon: <path d="M8,4 H16 V9 A4,4 0 0 1 8,9 Z M8,6 H5 A3,3 0 0 0 8,11 M16,6 H19 A3,3 0 0 1 16,11 M12,13 V17 M8,20 H16 M9,17 H15 V20 H9 Z" />,
  },
  {
    id: 'boutique',
    label: 'Boutique',
    icon: <path d="M5,8 H19 L18,20 H6 Z M9,8 V6 A3,3 0 0 1 15,6 V8" />,
  },
];

function Topbar() {
  const balles = useGame((s) => s.balles);
  const freePacks = useGame((s) => s.freePacks);
  const nextFreePackAt = useGame((s) => s.nextFreePackAt);
  const muted = useGame((s) => s.muted);
  const toggleMute = useGame((s) => s.toggleMute);
  const musicOff = useGame((s) => s.musicOff);
  const toggleMusic = useGame((s) => s.toggleMusic);
  const setTab = useUi((s) => s.setTab);
  const tab = useUi((s) => s.tab);
  const pseudo = useAccount((s) => s.session?.pseudo);
  const syncError = useAccount((s) => s.status === 'error');
  const avatar = useGame((s) => s.avatar);
  // demandes d'ami en attente de réponse
  const requests = useAccount((s) => (s.session ? s.friendships.filter((f) => f.status === 'pending' && f.toId === s.session!.userId).length : 0));
  const now = useNow(1000);
  const full = freePacks >= MAX_FREE_PACKS;

  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={() => setTab('boosters')} aria-label="AnimalCards, retour aux boosters">
        <Logo className="brand__logo" />
        <LogoMark className="brand__mark" />
      </button>
      <div className="topbar__right">
        <button type="button" className="chip chip--packs" onClick={() => setTab('boosters')} title="Boosters gratuits disponibles">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7,3 H17 L18,5 V19 L17,21 H7 L6,19 V5 Z" />
          </svg>
          <b>{freePacks}</b>
          <span className="chip__timer">{full ? 'plein' : formatDuration(nextFreePackAt - now)}</span>
        </button>
        <Balles value={balles} className="chip chip--balles" />
        <button
          type="button"
          className={`chip chip--profile${tab === 'profil' ? ' is-active' : ''}${pseudo ? '' : ' is-guest'}`}
          onClick={() => setTab('profil')}
          aria-label={pseudo ? `Profil de ${pseudo}${requests ? `, ${requests} demande${requests > 1 ? 's' : ''} d’ami` : ''}` : 'Profil : crée ton compte'}
          title={syncError ? 'La dernière sauvegarde n’est pas partie' : pseudo ? `Profil de ${pseudo}` : 'Crée ton compte pour sauvegarder ta progression'}
        >
          <Avatar athleteId={avatar} pseudo={pseudo} />
          <span className="chip__pseudo">{pseudo ?? 'Profil'}</span>
          {syncError && <i className="chip__alert" aria-hidden="true" />}
          {requests > 0 && (
            <i className="badge chip__badge" title={`${requests} demande${requests > 1 ? 's' : ''} d’ami`}>
              {requests}
            </i>
          )}
        </button>
        <button
          type="button"
          className={`icon-btn${musicOff || muted ? ' is-off' : ''}`}
          onClick={toggleMusic}
          disabled={muted}
          aria-label={musicOff ? 'Activer la musique' : 'Couper la musique'}
          aria-pressed={!musicOff}
          title={muted ? 'Le son est coupé' : musicOff ? 'Activer la musique' : 'Couper la musique'}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9,18 V6 L19,4 V16" />
            <circle cx={6.5} cy={18} r={2.5} />
            <circle cx={16.5} cy={16} r={2.5} />
            {(musicOff || muted) && <path d="M3,3 L21,21" />}
          </svg>
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => {
            toggleMute();
            if (muted) {
              setMuted(false);
              sfx.click();
            }
          }}
          aria-label={muted ? 'Activer le son' : 'Couper le son'}
          aria-pressed={!muted}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4,9 H8 L13,5 V19 L8,15 H4 Z" />
            {muted ? <path d="M17,9 L22,14 M22,9 L17,14" /> : <path d="M16.5,8.5 A5,5 0 0 1 16.5,15.5 M19,6 A8.5,8.5 0 0 1 19,18" />}
          </svg>
        </button>
      </div>
    </header>
  );
}

function BottomNav() {
  const tab = useUi((s) => s.tab);
  const setTab = useUi((s) => s.setTab);
  const freePacks = useGame((s) => s.freePacks);
  const activeSales = useGame((s) => s.market.myListings.filter((l) => l.status !== 'active').length);
  return (
    <nav className="bottomnav" aria-label="Navigation principale">
      {NAV.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`bottomnav__item${tab === item.id ? ' is-active' : ''}`}
          onClick={() => {
            sfx.click();
            setTab(item.id);
          }}
          aria-current={tab === item.id ? 'page' : undefined}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            {item.icon}
          </svg>
          <span>{item.label}</span>
          {item.id === 'boosters' && freePacks > 0 && <i className="badge">{freePacks}</i>}
          {item.id === 'mercato' && activeSales > 0 && <i className="badge badge--good">{activeSales}</i>}
        </button>
      ))}
    </nav>
  );
}

/** ordre des écrans de gauche à droite, pour faire pivoter la transition dans le bon sens */
const ORDER: Tab[] = ['boosters', 'collection', 'mercato', 'matchs', 'boutique', 'profil'];

export function App() {
  const tab = useUi((s) => s.tab);
  const previousTab = useRef(tab);
  const direction = ORDER.indexOf(tab) >= ORDER.indexOf(previousTab.current) ? 'next' : 'prev';
  useEffect(() => {
    previousTab.current = tab;
  }, [tab]);
  const tick = useGame((s) => s.tick);
  const muted = useGame((s) => s.muted);
  const musicOff = useGame((s) => s.musicOff);

  useEffect(() => {
    setMuted(muted);
  }, [muted]);

  // musique de fond : démarre au premier geste du joueur, se coupe avec le son, le bouton musique
  // ou quand l'onglet est caché
  useEffect(() => {
    const sync = () => setMusicEnabled(!muted && !musicOff && document.visibilityState === 'visible');
    sync();
    const onFirstGesture = () => {
      startMusic();
      sync();
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
    };
    window.addEventListener('pointerdown', onFirstGesture);
    window.addEventListener('keydown', onFirstGesture);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture);
      window.removeEventListener('keydown', onFirstGesture);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [muted, musicOff]);

  // marché en ligne : annonces des joueurs et règlement des ventes (souvent sur l'écran du marché,
  // de temps en temps ailleurs pour prévenir le vendeur dès qu'une carte part)
  const userId = useAccount((s) => s.session?.userId);
  useEffect(() => {
    if (!accountsEnabled()) return;
    if (!userId) useOnline.setState({ mine: [], history: [] });
    const sync = () => {
      if (document.visibilityState === 'visible') void useOnline.getState().sync();
    };
    sync();
    const id = window.setInterval(sync, tab === 'mercato' ? 15_000 : 60_000);
    document.addEventListener('visibilitychange', sync);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [userId, tab]);

  // le marché et les boosters avancent en temps réel (et rattrapent le temps passé hors du jeu)
  useEffect(() => {
    tick();
    const id = window.setInterval(() => tick(), 4000);
    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [tick]);

  return (
    <div className="app">
      {/* fond de page : un sous-bois sous les étoiles, fixe derrière le contenu */}
      <Landscape className="backdrop" scene={SITE_SCENE} seed="sous-bois" maxWidth={600} />
      <Fireflies />
      <Topbar />
      <main className="content" id="contenu">
        {/* chaque écran arrive en pivotant en 3D, du côté de l'onglet choisi */}
        <div key={tab} className={`view view--${direction}`}>
          {tab === 'boosters' && <HomeScreen />}
          {tab === 'collection' && <CollectionScreen />}
          {tab === 'mercato' && <MarketScreen />}
          {tab === 'matchs' && <MatchScreen />}
          {tab === 'boutique' && <ShopScreen />}
          {tab === 'profil' && <ProfileScreen />}
        </div>
      </main>
      <BottomNav />
      <CardDetail />
      <PackOpening />
      <Toasts />
      <Juice />
    </div>
  );
}
