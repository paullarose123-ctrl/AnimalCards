import { bass, bird, createBus, kalimba, midi, pluck, sharedAudio, strings, type Bus } from './engine';

// Musique de fond composée en direct avec Web Audio : aucun fichier, aucun droit d'auteur.
// Une pièce calme en ré majeur à 76 bpm, façon documentaire nature : arpèges de harpe (corde pincée),
// mélodie de kalimba qui respire, nappe de cordes, contrebasse et quelques chants d'oiseaux au loin.

const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const VOLUME = 0.42;

// 16 mesures : Ré – Si m – Sol – La, puis Ré – Fa# m – Sol – La (notes MIDI)
const PROGRESSION: Array<{ root: number; chord: number[] }> = [
  { root: 38, chord: [62, 66, 69] }, // Ré
  { root: 35, chord: [59, 62, 66] }, // Si m
  { root: 43, chord: [59, 62, 67] }, // Sol
  { root: 45, chord: [61, 64, 69] }, // La
  { root: 38, chord: [62, 66, 69] }, // Ré
  { root: 42, chord: [61, 66, 69] }, // Fa# m
  { root: 43, chord: [59, 62, 67] }, // Sol
  { root: 45, chord: [61, 64, 69] }, // La
];

// Ré majeur pentatonique, octave de la mélodie
const MELODY = [74, 76, 78, 81, 83, 86];
// motifs d'arpège (indices dans l'accord étalé sur deux octaves)
const ARPEGGIOS = [
  [0, 1, 2, 3, 4, 3, 2, 1],
  [0, 2, 1, 3, 2, 4, 3, 5],
  [0, 1, 2, 4, 5, 4, 2, 1],
];

let bus: Bus | null = null;
let timer: number | undefined;
let nextBar = 0;
let barIndex = 0;
let nextBird = 0;
let melodyNote = 2;
let enabled = true;
let started = false;

/** Programme une mesure entière. Chaque accord dure deux mesures. */
function scheduleBar(ac: AudioContext, out: Bus, t0: number, index: number) {
  const section = Math.floor(index / 16) % 2; // la deuxième fois, la mélodie est plus présente
  const step = Math.floor(index / 2) % PROGRESSION.length;
  const { root, chord } = PROGRESSION[step];
  const firstOfChord = index % 2 === 0;

  // nappe de cordes, tenue sur les deux mesures
  if (firstOfChord) strings(ac, out, chord.map(midi), t0, BAR * 2 - 0.4, 0.032, { attack: 1.6, release: 2.2, open: 1400 });

  // contrebasse sur les temps 1 et 3 (quinte au temps 3 une fois sur deux)
  bass(ac, out, midi(root), t0, BEAT * 1.7, 0.15);
  bass(ac, out, midi(root + (index % 2 ? 7 : 0)), t0 + BEAT * 2, BEAT * 1.5, 0.11);

  // arpège de harpe en croches
  const spread = [...chord, ...chord.map((n) => n + 12)];
  const pattern = ARPEGGIOS[(Math.floor(index / 4) + section) % ARPEGGIOS.length];
  pattern.forEach((k, i) => {
    if (i === 7 && index % 4 === 3) return; // une respiration en fin de phrase
    const swing = i % 2 ? 0.012 : 0;
    const accent = i % 4 === 0 ? 0.2 : 0.13;
    pluck(ac, out, midi(spread[k]), t0 + i * (BEAT / 2) + swing, accent, ((i % 4) - 1.5) * 0.18, 0.4);
  });

  // mélodie de kalimba : quelques notes qui se promènent dans la gamme, jamais trop chargée
  const density = section ? 0.55 : 0.35;
  for (let beat = 0; beat < 4; beat++) {
    if (Math.random() > density || (beat === 3 && index % 2)) continue;
    melodyNote = Math.max(0, Math.min(MELODY.length - 1, melodyNote + [-2, -1, -1, 1, 1, 2][Math.floor(Math.random() * 6)]));
    const t = t0 + beat * BEAT + (Math.random() < 0.3 ? BEAT / 2 : 0);
    kalimba(ac, out, midi(MELODY[melodyNote]), t, 0.11, 0.25);
  }

  // oiseaux au loin, de temps en temps
  if (t0 >= nextBird) {
    bird(ac, out, t0 + Math.random() * BAR, 0.012);
    nextBird = t0 + 6 + Math.random() * 6;
  }
}

function loop() {
  const ac = sharedAudio();
  if (!ac || !enabled || !bus) return;
  // on programme toujours un peu d'avance, sans jamais prendre de retard
  if (nextBar < ac.currentTime) nextBar = ac.currentTime + 0.1;
  while (nextBar < ac.currentTime + BAR * 1.2) {
    scheduleBar(ac, bus, nextBar, barIndex);
    nextBar += BAR;
    barIndex += 1;
  }
}

function fadeTo(value: number, seconds: number) {
  const ac = sharedAudio();
  if (!ac || !bus) return;
  for (const [node, level] of [[bus.dry, value], [bus.wet, value * 0.55]] as const) {
    node.gain.cancelScheduledValues(ac.currentTime);
    node.gain.setValueAtTime(node.gain.value, ac.currentTime);
    node.gain.linearRampToValueAtTime(level, ac.currentTime + seconds);
  }
}

function play() {
  const ac = sharedAudio();
  if (!ac) return;
  if (!bus) {
    bus = createBus(ac, 0, 0);
  }
  if (timer === undefined) {
    nextBar = Math.max(nextBar, ac.currentTime + 0.1);
    nextBird = Math.max(nextBird, ac.currentTime + 5);
    timer = window.setInterval(loop, 250);
    loop();
  }
  fadeTo(VOLUME, 3);
}

function stop() {
  fadeTo(0, 0.8);
  if (timer !== undefined) {
    window.clearInterval(timer);
    timer = undefined;
  }
}

/** Démarre la musique au premier geste du joueur (les navigateurs l'exigent). */
export function startMusic(): void {
  started = true;
  if (enabled) play();
}

/** Active ou coupe la musique (bouton musique, bouton son, onglet caché). */
export function setMusicEnabled(on: boolean): void {
  enabled = on;
  if (!started) return;
  if (on) play();
  else stop();
}
