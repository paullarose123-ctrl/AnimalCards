import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/base.css';
import './styles/card.css';
import './styles/app.css';
import { App } from './App';
import { Gallery } from './dev/Gallery';
import { useGame } from './store/game';

// En développement, l'état du jeu est accessible depuis la console (tests visuels).
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// #galerie affiche la planche de contrôle visuel (matières de cartes et drapeaux).
const isGallery = typeof window !== 'undefined' && window.location.hash === '#galerie';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isGallery ? <Gallery /> : <App />}
  </StrictMode>,
);
