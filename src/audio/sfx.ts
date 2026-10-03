// Effets sonores synthétisés avec Web Audio : aucun fichier à charger.
// Le son ne démarre qu'après une action du joueur (règle des navigateurs).

let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(value: boolean): void {
  muted = value;
}

function audio(): AudioContext | null {
  if (muted) return null;
  return sharedAudio();
}

/** Contexte audio commun aux effets et à la musique (créé au premier geste du joueur). */
export function sharedAudio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  start: number,
  duration: number,
  opts: { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number } = {},
): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(freq, t0);
  if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + duration);
  const peak = opts.gain ?? 0.18;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + (opts.attack ?? 0.012));
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

function noise(start: number, duration: number, opts: { gain?: number; freq?: number; q?: number; sweepTo?: number } = {}): void {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + start;
  const length = Math.max(1, Math.floor(ac.sampleRate * duration));
  const buffer = ac.createBuffer(1, length, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(opts.freq ?? 1200, t0);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + duration);
  filter.Q.value = opts.q ?? 0.8;
  const gain = ac.createGain();
  const peak = opts.gain ?? 0.25;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start(t0);
}

/** Nappe douce : sinusoïde à attaque lente, doublée à l'octave très bas, pour des sons feutrés. */
function pad(freq: number, start: number, duration: number, gain = 0.05): void {
  tone(freq, start, duration, { type: 'sine', gain, attack: 0.06 });
  tone(freq * 2, start, duration * 0.7, { type: 'sine', gain: gain * 0.18, attack: 0.08 });
}

// Sons de l'ouverture de booster : sobres et discrets, pensés comme des sons d'interface.
export const sfx = {
  click: () => tone(660, 0, 0.06, { type: 'triangle', gain: 0.08 }),
  /** ouverture du sachet : un léger bruit de papier */
  tear: () => {
    noise(0, 0.28, { gain: 0.07, freq: 2600, sweepTo: 1400, q: 0.6 });
  },
  whoosh: () => noise(0, 0.45, { gain: 0.22, freq: 400, sweepTo: 3200, q: 1.2 }),
  /** souffle d'air très doux quand les cartes apparaissent */
  burst: () => {
    noise(0, 0.7, { gain: 0.035, freq: 900, sweepTo: 2200, q: 0.5 });
  },
  /** effleurement de carte */
  deal: () => noise(0, 0.08, { gain: 0.025, freq: 3000, q: 0.9 }),
  /** retournement : un effleurement feutré */
  flip: () => {
    noise(0, 0.07, { gain: 0.06, freq: 2200, sweepTo: 3600, q: 0.8 });
  },
  /** révélation : une note tenue, puis un accord plus riche pour les cartes rares */
  reveal: (tier: number) => {
    const chords = [[523], [587], [659, 988], [587, 880, 1109], [523, 784, 1047, 1319]];
    const level = Math.max(0, Math.min(4, tier));
    chords[level].forEach((f, i) => pad(f, i * 0.03, 1.1 + level * 0.25, 0.045 - i * 0.006));
  },
  /** montée feutrée avant la révélation d'une grande carte */
  drumroll: (duration = 1.6) => {
    noise(0, duration, { gain: 0.03, freq: 300, sweepTo: 1800, q: 0.6 });
    tone(98, 0, duration, { type: 'sine', gain: 0.05, attack: duration * 0.8 });
  },
  /** grande carte : accord ample et lumineux, sans cuivres */
  fanfare: () => {
    [262, 392, 523, 659, 784].forEach((f, i) => pad(f, i * 0.04, 2.4, 0.05 - i * 0.006));
    tone(65, 0, 1.4, { type: 'sine', gain: 0.12, attack: 0.05 });
  },
  /** indice pendant la révélation d'une grande carte : pulsation grave et courte */
  pulse: () => tone(82, 0, 0.5, { type: 'sine', gain: 0.1, attack: 0.02 }),
  coin: () => {
    tone(988, 0, 0.08, { type: 'square', gain: 0.06 });
    tone(1319, 0.08, 0.25, { type: 'square', gain: 0.06 });
  },
  error: () => tone(220, 0, 0.2, { type: 'sawtooth', gain: 0.07, slideTo: 150 }),
  hit: () => {
    tone(110, 0, 0.25, { type: 'sine', gain: 0.35, slideTo: 50 });
    noise(0, 0.15, { gain: 0.2, freq: 800 });
  },
  ulti: () => {
    tone(220, 0, 0.5, { type: 'sawtooth', gain: 0.06, slideTo: 880 });
    noise(0, 0.5, { gain: 0.15, freq: 500, sweepTo: 5000 });
    tone(1760, 0.45, 0.4, { type: 'triangle', gain: 0.08 });
  },
};
