import { sharedAudio } from './sfx';

// Musique de fond composée en direct avec Web Audio : aucun fichier, aucun droit d'auteur.
// Une boucle calme de 24 secondes (4 accords de 2 mesures à 80 bpm) : nappe douce, basse ronde,
// petites notes pincées avec écho et un souffle de charleston. Volume volontairement bas.

const BPM = 80;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const VOLUME = 0.55;

// La mineur 9 → Fa majeur 7 → Do majeur 7 → Sol 6 (fréquences en Hz)
const CHORDS: Array<{ bass: number; pad: number[]; arp: number[] }> = [
  { bass: 55, pad: [220, 261.63, 329.63, 493.88], arp: [440, 523.25, 659.25, 493.88, 587.33] },
  { bass: 43.65, pad: [174.61, 220, 261.63, 329.63], arp: [349.23, 440, 523.25, 659.25, 523.25] },
  { bass: 65.41, pad: [196, 261.63, 329.63, 392], arp: [523.25, 659.25, 783.99, 493.88, 659.25] },
  { bass: 49, pad: [196, 246.94, 293.66, 329.63], arp: [392, 493.88, 587.33, 659.25, 587.33] },
];

let master: GainNode | null = null;
let echo: GainNode | null = null;
let timer: number | undefined;
let nextBar = 0;
let barIndex = 0;
let enabled = true;
let started = false;

function setup(ac: AudioContext) {
  if (master) return;
  master = ac.createGain();
  master.gain.value = 0;
  const lowpass = ac.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.value = 2400;
  master.connect(lowpass).connect(ac.destination);
  // écho doux pour les notes pincées
  const delay = ac.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ac.createGain();
  feedback.gain.value = 0.32;
  echo = ac.createGain();
  echo.gain.value = 0.35;
  echo.connect(delay);
  delay.connect(feedback).connect(delay);
  delay.connect(master);
}

function voice(ac: AudioContext, freq: number, t0: number, duration: number, opts: { type: OscillatorType; gain: number; attack: number; detune?: number; toEcho?: boolean }) {
  if (!master) return;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type;
  osc.frequency.value = freq;
  if (opts.detune) osc.detune.value = opts.detune;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(opts.gain, t0 + opts.attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(master);
  if (opts.toEcho && echo) gain.connect(echo);
  osc.start(t0);
  osc.stop(t0 + duration + 0.1);
}

function hat(ac: AudioContext, t0: number) {
  if (!master) return;
  const length = Math.floor(ac.sampleRate * 0.05);
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = 7000;
  const gain = ac.createGain();
  gain.gain.value = 0.012;
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

/** Programme une mesure : l'accord change toutes les deux mesures. */
function scheduleBar(ac: AudioContext, t0: number, index: number) {
  const chord = CHORDS[Math.floor(index / 2) % CHORDS.length];
  const firstOfChord = index % 2 === 0;
  if (firstOfChord) {
    for (const f of chord.pad) {
      voice(ac, f, t0, BAR * 2 + 0.6, { type: 'sine', gain: 0.022, attack: 1.4 });
      voice(ac, f, t0, BAR * 2 + 0.6, { type: 'triangle', gain: 0.008, attack: 1.6, detune: 7 });
    }
  }
  // basse ronde sur les temps 1 et 3
  voice(ac, chord.bass, t0, BEAT * 1.8, { type: 'sine', gain: 0.07, attack: 0.03 });
  voice(ac, chord.bass, t0 + BEAT * 2, BEAT * 1.6, { type: 'sine', gain: 0.05, attack: 0.03 });
  // notes pincées en croches, avec quelques silences pour respirer
  for (let step = 0; step < 8; step++) {
    if ((step + index) % 3 === 2) continue;
    const note = chord.arp[(step + index * 3) % chord.arp.length];
    voice(ac, note, t0 + step * (BEAT / 2), 0.5, { type: 'triangle', gain: 0.018, attack: 0.01, toEcho: true });
  }
  // souffle de charleston sur les contretemps
  for (let beat = 0; beat < 4; beat++) hat(ac, t0 + beat * BEAT + BEAT / 2);
}

function loop() {
  const ac = sharedAudio();
  if (!ac || !enabled) return;
  // on programme toujours un peu d'avance, sans jamais prendre de retard
  while (nextBar < ac.currentTime + BAR * 1.5) {
    scheduleBar(ac, nextBar, barIndex);
    nextBar += BAR;
    barIndex += 1;
  }
}

function fadeTo(value: number, seconds: number) {
  const ac = sharedAudio();
  if (!ac || !master) return;
  master.gain.cancelScheduledValues(ac.currentTime);
  master.gain.setValueAtTime(master.gain.value, ac.currentTime);
  master.gain.linearRampToValueAtTime(value, ac.currentTime + seconds);
}

function play() {
  const ac = sharedAudio();
  if (!ac) return;
  setup(ac);
  if (timer === undefined) {
    nextBar = Math.max(nextBar, ac.currentTime + 0.1);
    timer = window.setInterval(loop, 250);
    loop();
  }
  fadeTo(VOLUME, 2.5);
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
