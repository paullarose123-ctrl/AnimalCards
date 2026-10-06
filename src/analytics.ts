import { useGame } from './store/game';
import { useUi, type Tab } from './store/ui';

// Mesure d'audience anonyme avec GoatCounter : pas de cookie, pas d'identifiant du joueur, rien de revendu.
// Chaque ouverture du jeu et chaque écran visité comptent comme une page vue (/boosters, /collection…), et chaque
// booster ouvert comme un évènement : on sait combien de personnes ouvrent le jeu, et combien y jouent vraiment.
// Les statistiques se lisent sur https://animalcards.goatcounter.com.

/** Code du site GoatCounter (vide : aucune mesure). */
const GOATCOUNTER_CODE = 'animalcards';

/** Seulement sur le vrai site (ni en développement, ni dans la version de test). */
const ENABLED = !!GOATCOUNTER_CODE && import.meta.env.PROD && import.meta.env.MODE !== 'single' && /animalcards\.fr$/.test(window.location.hostname);

interface GoatCounter {
  no_onload?: boolean;
  count?: (vars: { path: string; title?: string; event?: boolean }) => void;
}

const SCREENS: Record<Tab, string> = {
  boosters: 'Accueil',
  collection: 'Collection',
  mercato: 'Marché',
  matchs: 'Duel',
  boutique: 'Boutique',
  profil: 'Profil',
};

const pending: Array<{ path: string; title?: string; event?: boolean }> = [];

function count(vars: { path: string; title?: string; event?: boolean }) {
  const gc = (window as unknown as { goatcounter?: GoatCounter }).goatcounter;
  if (gc?.count) gc.count(vars);
  else pending.push(vars);
}

export function startAnalytics() {
  if (!ENABLED) return;
  // le script est chargé une fois ; les pages sont comptées à la main (le jeu change d'écran sans changer de page)
  (window as unknown as { goatcounter: GoatCounter }).goatcounter = { no_onload: true };
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://gc.zgo.at/count.js';
  script.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  script.onload = () => {
    for (const vars of pending.splice(0)) count(vars);
  };
  document.head.appendChild(script);

  const screen = (tab: Tab) => count({ path: `/${tab}`, title: SCREENS[tab] });
  screen(useUi.getState().tab);
  useUi.subscribe((state, previous) => {
    if (state.tab !== previous.tab) screen(state.tab);
  });
  useGame.subscribe((state, previous) => {
    if (state.stats.packsOpened > previous.stats.packsOpened) count({ path: 'booster-ouvert', title: 'Booster ouvert', event: true });
  });
}
