// Effets sonores du jeu : de vrais timbres (kalimba, cloches, cordes, frottements de papier) joués
// à travers une chaîne de studio (réverbération de salle, compresseur). Aucun fichier à charger.
import { air, bell, boom, createBus, kalimba, midi, pluck, sharedAudio, strings, tick, type Bus } from './engine';

export { sharedAudio };

let muted = false;
let bus: Bus | null = null;

export function setMuted(value: boolean): void {
  muted = value;
}

/** Contexte et bus des effets, ou rien si le son est coupé ou indisponible. */
function audio(): { ac: AudioContext; bus: Bus; t: number } | null {
  if (muted) return null;
  const ac = sharedAudio();
  if (!ac) return null;
  bus ??= createBus(ac, 0.85, 0.35);
  return { ac, bus, t: ac.currentTime + 0.01 };
}

/** Vibration du téléphone (Android) : le jeu se ressent aussi dans la main. Coupée avec le son. */
export function buzz(pattern: number | number[]): void {
  if (muted) return;
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // pas de vibreur
  }
}

// Gamme de ré majeur pentatonique, comme la musique : tous les effets sonnent juste avec elle.
const PENTA = [62, 64, 66, 69, 71, 74, 76, 78, 81, 83, 86, 88, 90, 93];

export const sfx = {
  /** clic de bouton : petit tic boisé */
  click: () => {
    buzz(6);
    const a = audio();
    if (a) tick(a.ac, a.bus, a.t, 0.06, 1800);
  },
  /** ouverture du sachet : papier aluminium froissé qui se déchire */
  tear: () => {
    const a = audio();
    if (!a) return;
    for (let i = 0; i < 9; i++) {
      const t = a.t + i * 0.035 + Math.random() * 0.02;
      air(a.ac, a.bus, t, 0.05 + Math.random() * 0.04, {
        gain: 0.06 + Math.random() * 0.05,
        from: 2600 + Math.random() * 2400,
        to: 1500,
        q: 2.5,
        attack: 0.003,
        pan: Math.random() * 0.6 - 0.3,
        send: 0.15,
      });
    }
    air(a.ac, a.bus, a.t, 0.4, { gain: 0.05, from: 900, to: 4000, q: 0.6, attack: 0.02, send: 0.2 });
  },
  /** passage rapide : un souffle qui monte */
  whoosh: () => {
    const a = audio();
    if (a) air(a.ac, a.bus, a.t, 0.5, { gain: 0.13, from: 300, to: 2500, q: 1.1, attack: 0.18, send: 0.4 });
  },
  /** sachet ouvert : éclat lumineux de cloches */
  burst: () => {
    const a = audio();
    if (!a) return;
    [81, 86, 90, 93].forEach((n, i) => bell(a.ac, a.bus, midi(n), a.t + i * 0.05, 0.05, (i - 1.5) * 0.3, 1.6));
    air(a.ac, a.bus, a.t, 0.7, { gain: 0.07, from: 6000, to: 2000, q: 0.5, attack: 0.01, send: 0.8 });
  },
  /** une carte posée : glissement sec sur la table */
  deal: () => {
    buzz(5);
    const a = audio();
    if (a) air(a.ac, a.bus, a.t, 0.09, { gain: 0.07, from: 3500, to: 2200, type: 'highpass', q: 0.5, attack: 0.008, pan: Math.random() * 0.4 - 0.2, send: 0.1 });
  },
  /** carte retournée */
  flip: () => {
    const a = audio();
    if (!a) return;
    air(a.ac, a.bus, a.t, 0.12, { gain: 0.08, from: 1800, to: 4200, q: 0.8, attack: 0.03, send: 0.2 });
    tick(a.ac, a.bus, a.t + 0.1, 0.035, 1300);
  },
  /** révélation d'une carte : plus elle est rare, plus l'arpège de kalimba est riche */
  reveal: (tier: number) => {
    const a = audio();
    if (!a) return;
    const level = Math.max(0, Math.min(4, tier));
    buzz(level >= 4 ? [40, 50, 40, 50, 160] : level >= 3 ? [30, 40, 80] : 10);
    const count = 2 + level;
    const start = 5 - Math.min(2, level);
    for (let i = 0; i < count; i++) {
      const note = PENTA[start + i * (level >= 3 ? 2 : 1)] ?? 93;
      kalimba(a.ac, a.bus, midi(note), a.t + i * 0.075, 0.16, (i / Math.max(1, count - 1) - 0.5) * 0.6);
    }
    if (level >= 3) bell(a.ac, a.bus, midi(level === 4 ? 98 : 93), a.t + count * 0.075, 0.06, 0, 2.8);
    if (level >= 4) {
      strings(a.ac, a.bus, [midi(62), midi(66), midi(69), midi(74)], a.t, 1.2, 0.045, { attack: 0.25, release: 2.2, open: 2600 });
      boom(a.ac, a.bus, a.t, 0.18, 55);
    }
  },
  /** suspense avant une carte rare : cordes qui montent et grondement sourd */
  drumroll: (duration = 1.6) => {
    const a = audio();
    if (!a) return;
    strings(a.ac, a.bus, [midi(50), midi(57), midi(62), midi(64)], a.t, duration, 0.04, { attack: duration * 0.9, release: 0.6, open: 3000 });
    air(a.ac, a.bus, a.t, duration + 0.2, { gain: 0.06, from: 120, to: 260, type: 'lowpass', q: 0.7, attack: duration * 0.8, send: 0.3 });
    air(a.ac, a.bus, a.t, duration + 0.1, { gain: 0.035, from: 1500, to: 6000, q: 1.5, attack: duration * 0.9, send: 0.6 });
  },
  /** victoire, carte légendaire : accord plein, arpège de harpe, cloche et timbale */
  fanfare: () => {
    buzz([60, 60, 140]);
    const a = audio();
    if (!a) return;
    boom(a.ac, a.bus, a.t, 0.25, 55);
    strings(a.ac, a.bus, [midi(50), midi(62), midi(66), midi(69), midi(74)], a.t, 1.4, 0.05, { attack: 0.08, release: 2.4, open: 3200 });
    [62, 66, 69, 74, 78, 81, 86].forEach((n, i) => pluck(a.ac, a.bus, midi(n), a.t + i * 0.055, 0.22, (i - 3) * 0.12, 0.6));
    bell(a.ac, a.bus, midi(90), a.t + 0.4, 0.07, 0.2, 3);
  },
  /** battement discret (compte à rebours, tour qui commence) */
  pulse: () => {
    const a = audio();
    if (a) boom(a.ac, a.bus, a.t, 0.16, 80);
  },
  /** pièces, graines gagnées : deux petites cloches */
  coin: () => {
    buzz(12);
    const a = audio();
    if (!a) return;
    bell(a.ac, a.bus, midi(95), a.t, 0.05, -0.15, 0.9);
    bell(a.ac, a.bus, midi(100), a.t + 0.08, 0.06, 0.15, 1.4);
  },
  /** action impossible : deux notes graves qui descendent, sans agressivité */
  error: () => {
    buzz([20, 50, 20]);
    const a = audio();
    if (!a) return;
    pluck(a.ac, a.bus, midi(57), a.t, 0.25, 0, 0.3);
    pluck(a.ac, a.bus, midi(53), a.t + 0.11, 0.25, 0, 0.3);
  },
  /** coup marquant (point gagné en duel) */
  hit: () => {
    buzz([40, 30, 60]);
    const a = audio();
    if (!a) return;
    boom(a.ac, a.bus, a.t, 0.28, 65);
    air(a.ac, a.bus, a.t, 0.18, { gain: 0.1, from: 2400, to: 500, q: 0.8, attack: 0.004, send: 0.3 });
  },
};
