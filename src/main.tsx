import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/fonts.css';
import './styles/base.css';
import './styles/card.css';
import './styles/app.css';
import { App } from './App';
import { AllCards, Gallery } from './dev/Gallery';
import { useGame } from './store/game';
import { startAutoSave } from './store/account';

// En développement, l'état du jeu est accessible depuis la console (tests visuels).
if (import.meta.env.DEV) (window as unknown as { __game: typeof useGame }).__game = useGame;

// #galerie affiche la planche de contrôle visuel (matières de cartes et drapeaux) ;
// #toutes-les-cartes affiche toutes les cartes, pour la planche de revue.
const hash = typeof window !== 'undefined' ? window.location.hash : '';

// la partie d'un joueur connecté part toute seule dans son compte
startAutoSave();

createRoot(document.getElementById('root')!).render(
  <StrictMode>{hash === '#galerie' ? <Gallery /> : hash === '#toutes-les-cartes' ? <AllCards /> : <App />}</StrictMode>,
);
