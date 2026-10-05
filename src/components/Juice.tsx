import { useEffect, useRef } from 'react';
import { useGame } from '../store/game';

// Petites sensations de jeu, globales :
// - une onde part du doigt quand on appuie sur un bouton ;
// - quand on gagne des graines, des pièces s'envolent du milieu de l'écran jusqu'au solde.

const reduce = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

function ripple(event: PointerEvent) {
  const target = (event.target as Element | null)?.closest<HTMLElement>('.btn');
  if (!target || (target as HTMLButtonElement).disabled || reduce()) return;
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 1.6;
  const wave = document.createElement('span');
  wave.className = 'ripple';
  wave.style.width = wave.style.height = `${size}px`;
  wave.style.left = `${event.clientX - rect.left - size / 2}px`;
  wave.style.top = `${event.clientY - rect.top - size / 2}px`;
  target.appendChild(wave);
  wave.addEventListener('animationend', () => wave.remove());
}

function flyCoins(count: number) {
  const chip = document.querySelector<HTMLElement>('.chip--balles');
  if (!chip || reduce()) return;
  const to = chip.getBoundingClientRect();
  const tx = to.left + 18;
  const ty = to.top + to.height / 2;
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight * 0.55;
  for (let i = 0; i < count; i++) {
    const coin = document.createElement('i');
    coin.className = 'flying-coin';
    document.body.appendChild(coin);
    const sx = cx + (Math.random() - 0.5) * 160;
    const sy = cy + (Math.random() - 0.5) * 80;
    // trajectoire en arc : la pièce jaillit vers le haut puis file vers le solde
    const mx = (sx + tx) / 2 + (Math.random() - 0.5) * 220;
    const my = Math.min(sy, ty) - 60 - Math.random() * 120;
    const animation = coin.animate(
      [
        { transform: `translate(${sx}px, ${sy}px) scale(0.2) rotateY(0deg)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy - 30}px) scale(1.1) rotateY(180deg)`, opacity: 1, offset: 0.18 },
        { transform: `translate(${mx}px, ${my}px) scale(1) rotateY(540deg)`, opacity: 1, offset: 0.6 },
        { transform: `translate(${tx}px, ${ty}px) scale(0.5) rotateY(900deg)`, opacity: 0.9 },
      ],
      { duration: 900 + Math.random() * 300, delay: i * 45, easing: 'cubic-bezier(0.45, 0, 0.3, 1)', fill: 'backwards' },
    );
    animation.onfinish = () => {
      coin.remove();
      if (i === count - 1) {
        chip.classList.remove('is-hit');
        void chip.offsetWidth;
        chip.classList.add('is-hit');
      }
    };
  }
}

export function Juice() {
  const balles = useGame((s) => s.balles);
  const previous = useRef(balles);

  useEffect(() => {
    document.addEventListener('pointerdown', ripple);
    return () => document.removeEventListener('pointerdown', ripple);
  }, []);

  useEffect(() => {
    const gain = balles - previous.current;
    previous.current = balles;
    // gains du jeu seulement (pas le chargement d'une sauvegarde ni le solde de test)
    if (gain > 0 && gain < 1_000_000) flyCoins(Math.min(14, 4 + Math.round(Math.log10(gain) * 2)));
  }, [balles]);

  return null;
}
