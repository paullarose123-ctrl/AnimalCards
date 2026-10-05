// Boîte à outils des paysages peints : hasard reproductible, couleurs, reliefs, arbres, oiseaux, montagnes
// et silhouettes d'animaux. Tout produit des chemins SVG (chaînes `d`), en unités du repère de la scène.
// Les longueurs d'onde des reliefs sont fixes (calées sur une affiche de 120 de large) : une scène plus large
// a simplement plus de collines et d'arbres.

export type Rng = () => number;
export type Pt = [number, number];
export type Pt3 = [number, number, number];
export type Profile = (x: number) => number;

/** hauteur commune à toutes les scènes (celle d'un booster) */
export const SCENE_H = 172;
/** largeur d'un booster, et longueur de référence des reliefs */
export const SPAN = 120;

export function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Mélange deux couleurs #rrggbb (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  return `#${ca.map((v, i) => Math.round(v + (cb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export function isLight(hex: string): boolean {
  const [r, g, b] = rgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 150;
}

/** arrondi au dixième, pour des chemins SVG courts */
export const f = (n: number) => Math.round(n * 10) / 10;
export const pts = (list: Pt[]) => list.map(([x, y]) => `${f(x)} ${f(y)}`).join('L');
export const poly = (list: Pt[]) => `M${pts(list)}Z`;

export function ellipse(cx: number, cy: number, rx: number, ry: number): string {
  // le diamètre se calcule sur le rayon déjà arrondi : sinon, pour un petit point, la corde ne vaut plus le
  // diamètre et les deux demi-arcs se décalent (une étoile devient deux ronds superposés)
  const a = f(rx);
  const b = f(ry);
  return `M${f(cx - a)} ${f(cy)}a${a} ${b} 0 1 0 ${2 * a} 0a${a} ${b} 0 1 0 ${-2 * a} 0Z`;
}

export const circle = (cx: number, cy: number, r: number) => ellipse(cx, cy, r, r);

/** Relief doux : somme de sinusoïdes à phases aléatoires ; `jag` ajoute de la rugosité. */
export function hills(r: Rng, base: number, amp: number, jag = 0): Profile {
  const waves = [
    [0.9, 0.6],
    [2.1, 0.28],
    [4.7, 0.1 + jag * 0.15],
    [11, jag * 0.12],
    [23, jag * 0.06],
  ].map(([k, a]) => ({ f: (k * Math.PI * 2 * (0.85 + r() * 0.3)) / SPAN, p: r() * Math.PI * 2, a }));
  return (x) => base - amp * waves.reduce((s, w) => s + w.a * Math.sin(x * w.f + w.p), 0);
}

/** Chaîne de sommets : des pics [x, hauteur, demi-largeur] posés sur une base, plus un peu de rugosité. */
export function peaks(r: Rng, base: number, list: Pt3[], jag = 1.4): Profile {
  const rough = hills(r, 0, jag, 1);
  return (x) => {
    let h = 0;
    for (const [px, ph, pw] of list) h = Math.max(h, ph * Math.max(0, 1 - Math.abs(x - px) / pw) ** 1.15);
    return base - h + rough(x);
  };
}

/** Surface pleine sous un profil, sur toute la largeur `w`. */
export function area(profile: Profile, w: number, step = 1.5): string {
  let d = `M-2 ${SCENE_H + 2}`;
  for (let x = -2; x <= w + 2.01; x += step) d += `L${f(x)} ${f(profile(x))}`;
  return `${d}L${f(w + 2)} ${SCENE_H + 2}Z`;
}

/** Sapin stylisé : trois étages en dents de scie. */
const PINE: Pt[] = [
  [0, -1],
  [0.42, -0.66],
  [0.22, -0.67],
  [0.7, -0.36],
  [0.42, -0.37],
  [1, 0.03],
  [0.12, 0.03],
  [0.12, 0.1],
];

export function pine(x: number, y: number, h: number): string {
  const w = h * 0.36;
  const right = PINE.map(([px, py]): Pt => [x + px * w, y + py * h]);
  const left = PINE.slice(1)
    .reverse()
    .map(([px, py]): Pt => [x - px * w, y + py * h]);
  return poly([...right, ...left]);
}

/** Arbre feuillu : tronc fin… */
export function lollipop(x: number, y: number, h: number): string {
  const t = Math.max(0.35, h * 0.05);
  return poly([
    [x - t, y + 0.5],
    [x - t * 0.7, y - h * 0.55],
    [x + t * 0.7, y - h * 0.55],
    [x + t, y + 0.5],
  ]);
}

/** …et houppier rond. */
export const crown = (x: number, y: number, h: number) => circle(x, y - h * 0.66, h * 0.36);

/** Acacia : tronc fourchu… */
export function acaciaTrunk(x: number, y: number, h: number): string {
  const t = h * 0.035;
  return poly([
    [x - t, y + 0.5],
    [x - t * 0.6, y - h * 0.55],
    [x - h * 0.22, y - h * 0.82],
    [x - h * 0.18, y - h * 0.85],
    [x, y - h * 0.63],
    [x + h * 0.2, y - h * 0.87],
    [x + h * 0.24, y - h * 0.84],
    [x + t * 0.8, y - h * 0.55],
    [x + t, y + 0.5],
  ]);
}

/** …et couronne plate en parasol. */
export function acaciaCrown(x: number, y: number, h: number): string {
  return (
    ellipse(x, y - h * 0.9, h * 0.5, h * 0.075) +
    ellipse(x - h * 0.24, y - h * 0.93, h * 0.27, h * 0.065) +
    ellipse(x + h * 0.22, y - h * 0.95, h * 0.25, h * 0.06) +
    ellipse(x + h * 0.02, y - h * 0.98, h * 0.2, h * 0.05)
  );
}

/** Emplacements le long d'un profil, espacés au hasard, sur la largeur `w` : [x, y, taille]. */
export function spots(r: Rng, profile: Profile, w: number, min: number, max: number, gap: number, sink = 1): Pt3[] {
  const out: Pt3[] = [];
  for (let x = -6 + r() * gap; x < w + 6; x += gap * (0.55 + r() * 0.9)) out.push([x, profile(x) + sink, min + r() * (max - min)]);
  return out;
}

export const draw = (list: Pt3[], make: (x: number, y: number, size: number) => string) => list.map(([x, y, s]) => make(x, y, s)).join('');

/** Touffes d'herbe : des brins en triangles fins. */
export function grass(r: Rng, profile: Profile, w: number, min: number, max: number, gap: number): string {
  let d = '';
  for (let x = -2 + r() * gap; x < w + 2; x += gap * (0.5 + r())) {
    const y = profile(x) + 0.8;
    const n = 3 + Math.floor(r() * 4);
    for (let i = 0; i < n; i++) {
      const h = min + r() * (max - min);
      const bx = x + (i - n / 2) * 0.6;
      const lean = (i - n / 2) * 0.9 + (r() - 0.5) * 1.2;
      d += poly([
        [bx - 0.35, y],
        [bx + lean, y - h],
        [bx + 0.35, y],
      ]);
    }
  }
  return d;
}

/** Fronde de palmier ou de fougère : tige courbe et folioles, plus courtes aux deux bouts. */
export function frond(r: Rng, x0: number, y0: number, angle: number, len: number, bend: number, leaf: number): { stem: string; leaves: string } {
  const a = (angle * Math.PI) / 180;
  const x2 = x0 + Math.cos(a) * len;
  const y2 = y0 + Math.sin(a) * len;
  const cx = (x0 + x2) / 2 + Math.cos(a + Math.PI / 2) * bend;
  const cy = (y0 + y2) / 2 + Math.sin(a + Math.PI / 2) * bend;
  const at = (t: number): Pt => [(1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x2, (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y2];
  let leaves = '';
  for (let t = 0.1; t < 0.97; t += 0.05) {
    const [px, py] = at(t);
    const [qx, qy] = at(t + 0.01);
    const heading = Math.atan2(qy - py, qx - px);
    const size = leaf * Math.sin(Math.PI * Math.min(1, t * 1.1)) ** 0.6 * (0.85 + r() * 0.3);
    for (const side of [-1, 1]) {
      const ang = heading + side * (0.9 + r() * 0.15);
      const dx = Math.cos(ang);
      const dy = Math.sin(ang) + 0.25;
      const tip: Pt = [px + dx * size, py + dy * size];
      const mx = px + dx * size * 0.5;
      const my = py + dy * size * 0.5;
      const w = size * 0.2;
      leaves += `M${f(px)} ${f(py)}Q${f(mx - dy * w)} ${f(my + dx * w)} ${f(tip[0])} ${f(tip[1])}Q${f(mx + dy * w)} ${f(my - dx * w)} ${f(px)} ${f(py)}Z`;
    }
  }
  return { stem: `M${f(x0)} ${f(y0)}Q${f(cx)} ${f(cy)} ${f(x2)} ${f(y2)}`, leaves };
}

/** Oiseau en vol, ailes en « m » aplati. */
export function bird(x: number, y: number, s: number, flap: number): string {
  return `M${f(x)} ${f(y)}Q${f(x - s * 0.45)} ${f(y - s * 0.55 * flap)} ${f(x - s)} ${f(y - s * 0.22 * flap)}Q${f(x - s * 0.5)} ${f(y - s * 0.12)} ${f(x)} ${f(y + s * 0.2)}Q${f(x + s * 0.5)} ${f(y - s * 0.12)} ${f(x + s)} ${f(y - s * 0.22 * flap)}Q${f(x + s * 0.45)} ${f(y - s * 0.55 * flap)} ${f(x)} ${f(y)}Z`;
}

/** Ligne brisée d'un point à un autre (arêtes de montagne). */
export function edge(r: Rng, a: Pt, b: Pt, n: number, jit: number): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const j = i === 0 || i === n ? 0 : (r() - 0.5) * 2 * jit;
    out.push([a[0] + (b[0] - a[0]) * t + j, a[1] + (b[1] - a[1]) * t + j * 0.35]);
  }
  return out;
}

/** Montagne avec sa face à l'ombre et sa calotte de neige. */
export function mountain(r: Rng, px: number, py: number, base: number, wl: number, wr: number) {
  const left = edge(r, [px, py], [px - wl, base], 9, 1.5);
  const right = edge(r, [px, py], [px + wr, base], 9, 1.5);
  const body = poly([...left.slice().reverse(), ...right.slice(1)]);
  const crest = edge(r, [px, py], [px + wr * 0.2, base], 9, 1.3);
  const shadow = poly([...crest, ...right.slice().reverse().slice(0, -1)]);
  const k = 3;
  const [lx, ly] = left[k];
  const [rx, ry] = right[k];
  const zig: Pt[] = [];
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    zig.push([lx + (rx - lx) * t, ly + (ry - ly) * t + (i % 2 ? 3 : -0.8) * (0.6 + r() * 0.8)]);
  }
  const snow = poly([...left.slice(0, k + 1), ...zig, ...right.slice(0, k + 1).reverse().slice(0, -1)]);
  return { body, shadow, snow };
}

// ───────────── silhouettes d'animaux (coordonnées locales, pattes à y = 0, tournés vers la droite) ─────────────

export const WOLF =
  'M-10 0C-9 -1.4 -6.6 -1.6 -5 -2.6C-6 -4.6 -6.2 -8 -5 -11C-4.2 -13.6 -3 -15.6 -1.6 -17.4C-0.8 -18.6 -0.2 -19.6 0.2 -20.6L-0.2 -23.6L1.3 -21.7L1.6 -23.4L2.5 -21.4C3.3 -21.6 4.3 -22.6 5.6 -24.6L6.5 -25.4L6.3 -24.5L5.4 -23.8L6 -23.1C5 -22.4 4.3 -21.4 3.9 -20.4C4.6 -18 4.9 -15.6 4.4 -13C4.2 -11 4.4 -8 4.3 -1L5.8 -0.5L5.8 0L2.6 0L2.9 -1C2.6 -4 2.2 -6 1.4 -7.5C0.6 -5 -0.6 -2.6 0.8 -0.8L1.6 0Z';

export const KANGAROO =
  'M-13 0.2C-8.6 -0.6 -5.4 -2.2 -3.6 -4.8C-5.2 -8 -4.8 -12 -2.8 -15C-1.2 -17.6 0.2 -19.4 1 -21L0.8 -24.4L2 -21.8L2.6 -24.6L3.1 -21.6C4.1 -21.4 5.5 -20.6 6.5 -20L6.4 -19.3C5 -19 3.7 -18.6 3.1 -17.6C3.3 -16 3.1 -14.8 3.5 -13.4L5.5 -12.4L5.3 -11.7L3.2 -12.3C3 -10 2.6 -8 1.5 -6L1.7 -4L5.8 -0.6L6 0L0.4 0C-0.6 -1.6 -1.6 -2.6 -2.4 -3.4Z';

export const WHALE_TAIL =
  'M-1.3 0C-1.1 -4 -0.9 -7 -0.6 -9C-3 -10.4 -6.6 -11 -8.8 -13.8C-6 -13.4 -2.6 -12.8 0 -11.2C2.6 -12.8 6 -13.4 8.8 -13.8C6.6 -11 3 -10.4 0.6 -9C0.9 -7 1.1 -4 1.3 0Z';

export const EAGLE =
  'M0 -1.3C0.6 -1.3 0.9 -0.7 1.2 -0.4L5 -1.7L9.6 -1.3L8.6 -0.4L9.8 -0.2L8.4 0.3L9.4 0.7L7.6 1L4.6 1.3L1.4 1.5L2.3 3.5L0 2.9L-2.3 3.5L-1.4 1.5L-4.6 1.3L-7.6 1L-9.4 0.7L-8.4 0.3L-9.8 -0.2L-8.6 -0.4L-9.6 -1.3L-5 -1.7L-1.2 -0.4C-0.9 -0.7 -0.6 -1.3 0 -1.3Z';

export const PTERO =
  'M-10 -3.4L-6 -1.2L-1.6 -0.6L0.8 -1L1.6 -1.9L0.4 -3.6L2.5 -2.4L6.4 -1.8L2.6 -1.2L1.8 -0.4L6 -0.8L10 -3.4L7.4 0.2L2.4 1.2L0.6 2.4L-0.8 1.4L-6.4 0.4Z';

export const MANTA =
  'M-1.6 -5.6L-1.2 -7.4L-0.6 -5.8Q0 -6.2 0.6 -5.8L1.2 -7.4L1.6 -5.6C4 -4.5 8 -2.5 12 1.5C8 0.4 4 1.5 1.4 4L0.4 5L0.2 12L-0.2 12L-0.4 5L-1.4 4C-4 1.5 -8 0.4 -12 1.5C-8 -2.5 -4 -4.5 -1.6 -5.6Z';

export const DOLPHIN =
  'M-8 2C-4 -3 4 -3.2 8 -0.2L10 -0.3L8.4 0.8C4 0.2 -2 0.6 -6 3L-7.6 5.6L-8.4 3.2L-10.4 2.4Z M-1 -2.3L-2.8 -4.8L1.6 -2.5Z';
