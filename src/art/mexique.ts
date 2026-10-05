// Silhouettes du Mexique pour les paysages peints de la Série 2 : agave, nopal, cardon, pyramide à degrés de
// Teotihuacan, volcan à cratère (Popocatépetl) et neige de crête (Iztaccíhuatl). Même principe que le kit :
// des chemins SVG (chaînes `d`) dans le repère de la scène.

import { edge, ellipse, f, poly, type Profile, type Pt, type Rng } from './kit';

/** Ellipse inclinée, en polygone (raquettes de nopal). */
function tilted(cx: number, cy: number, rx: number, ry: number, deg: number): string {
  const a = (deg * Math.PI) / 180;
  const list: Pt[] = [];
  for (let i = 0; i < 22; i++) {
    const t = (i / 22) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    list.push([cx + x * Math.cos(a) - y * Math.sin(a), cy + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return poly(list);
}

/** Agave : rosette de longues feuilles pointues, en éventail. */
export function agave(x: number, y: number, h: number): string {
  let d = '';
  const n = 9;
  for (let i = 0; i < n; i++) {
    const deg = -166 + (i * 152) / (n - 1);
    const a = (deg * Math.PI) / 180;
    const len = h * (0.5 + 0.5 * Math.sin((i / (n - 1)) * Math.PI)) * (i % 2 ? 0.86 : 1);
    const w = h * 0.08;
    const bend = (deg + 90) * 0.04;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    const tip: Pt = [x + Math.cos(a) * len + bend, y + Math.sin(a) * len];
    const mid: Pt = [x + Math.cos(a) * len * 0.5 + bend * 0.3, y + Math.sin(a) * len * 0.5];
    d += poly([
      [x + nx * w, y + ny * w],
      [mid[0] + nx * w * 0.55, mid[1] + ny * w * 0.55],
      tip,
      [mid[0] - nx * w * 0.55, mid[1] - ny * w * 0.55],
      [x - nx * w, y - ny * w],
    ]);
  }
  return d;
}

/** Nopal (figuier de Barbarie) : raquettes ovales empilées, figues sur les bords. */
export function nopal(x: number, y: number, h: number): string {
  const s = h / 22;
  const pads: Array<[number, number, number, number, number]> = [
    [0, -5.2, 3.6, 5.4, 0],
    [-3.8, -11.8, 2.8, 4.1, -28],
    [3.6, -12.6, 3, 4.4, 24],
    [-0.4, -18, 2.5, 3.5, -6],
    [6.8, -18.8, 2.2, 3.1, 34],
    [-7, -16.6, 2.1, 3, -40],
  ];
  let d = '';
  for (const [px, py, rx, ry, rot] of pads) d += tilted(x + px * s, y + py * s, rx * s, ry * s, rot);
  for (const [px, py] of [
    [-0.4, -21.8],
    [7.4, -22.1],
    [-8, -19.6],
    [-1.6, -21.4],
  ])
    d += ellipse(x + px * s, y + py * s, 0.8 * s, 1 * s);
  return d;
}

/** Cardon (grand cactus colonnaire) : tronc et bras, à tracer en trait épais (environ 12 % de la hauteur). */
export function cardon(x: number, y: number, h: number): string {
  return (
    `M${f(x)} ${f(y + 1)}L${f(x)} ${f(y - h)}` +
    `M${f(x)} ${f(y - h * 0.34)}L${f(x - h * 0.22)} ${f(y - h * 0.34)}L${f(x - h * 0.22)} ${f(y - h * 0.74)}` +
    `M${f(x)} ${f(y - h * 0.46)}L${f(x + h * 0.2)} ${f(y - h * 0.46)}L${f(x + h * 0.2)} ${f(y - h * 0.82)}` +
    `M${f(x)} ${f(y - h * 0.22)}L${f(x + h * 0.36)} ${f(y - h * 0.22)}L${f(x + h * 0.36)} ${f(y - h * 0.5)}`
  );
}

/**
 * Pyramide à degrés de Teotihuacan : cinq gradins en talus, temple au sommet, escalier central.
 * `shade` est la moitié à l'ombre, `rims` le fil de lumière au bord de chaque gradin (contre-jour).
 */
export function pyramid(cx: number, base: number, w: number, h: number) {
  const tiers = 5;
  const th = (h * 0.86) / tiers;
  let body = '';
  let shade = '';
  let rims = '';
  let hw = w / 2;
  let y = base;
  for (let i = 0; i < tiers; i++) {
    const top = y - th;
    const hwTop = hw - th * 0.42;
    body += poly([
      [cx - hw, y + 0.4],
      [cx - hwTop, top],
      [cx + hwTop, top],
      [cx + hw, y + 0.4],
    ]);
    shade += poly([
      [cx + w * 0.07, y + 0.4],
      [cx + w * 0.07, top],
      [cx + hwTop, top],
      [cx + hw, y + 0.4],
    ]);
    rims += `M${f(cx - hwTop)} ${f(top)}H${f(cx + hwTop)}`;
    y = top;
    hw = hwTop - w * 0.05;
  }
  const tw = w * 0.11;
  const tt = h * 0.14;
  body += poly([
    [cx - tw, y + 0.4],
    [cx - tw, y - tt],
    [cx + tw, y - tt],
    [cx + tw, y + 0.4],
  ]);
  shade += poly([
    [cx + tw * 0.25, y + 0.4],
    [cx + tw * 0.25, y - tt],
    [cx + tw, y - tt],
    [cx + tw, y + 0.4],
  ]);
  const sb = w * 0.07;
  const st = tw * 0.55;
  const stairs = poly([
    [cx - sb, base + 0.4],
    [cx - st, y],
    [cx + st, y],
    [cx + sb, base + 0.4],
  ]);
  let steps = '';
  for (let yy = base - 1.2; yy > y + 0.6; yy -= 1.45) {
    const k = (base - yy) / (base - y);
    const half = sb - (sb - st) * k - 0.25;
    steps += `M${f(cx - half)} ${f(yy)}H${f(cx + half)}`;
  }
  return { body, shade, rims, stairs, steps };
}

/** Volcan à cratère (Popocatépetl) : cône, calotte de neige au bord dentelé, face à l'ombre. */
export function volcano(r: Rng, px: number, py: number, base: number, wl: number, wr: number) {
  const crater = 3.4;
  const left = edge(r, [px - crater, py], [px - wl, base], 8, 0.9);
  const right = edge(r, [px + crater, py + 0.4], [px + wr, base], 8, 0.9);
  const rim: Pt[] = [
    [px - crater * 0.4, py + 0.9],
    [px + crater * 0.45, py + 0.8],
  ];
  const body = poly([...left.slice().reverse(), ...rim, ...right]);
  // la neige descend d'environ un tiers de chaque flanc ; son bord inférieur dentelé va de gauche à droite
  const kl = Math.round(0.32 * (left.length - 1));
  const kr = Math.round(0.3 * (right.length - 1));
  const sl = left[kl];
  const sr = right[kr];
  const jag: Pt[] = [];
  for (let i = 1; i < 7; i++) {
    const t = i / 7;
    jag.push([sl[0] + (sr[0] - sl[0]) * t, sl[1] + (sr[1] - sl[1]) * t + (i % 2 ? -1.2 : 2.2)]);
  }
  const snow = poly([...rim.slice().reverse(), ...left.slice(0, kl + 1), ...jag, ...right.slice(0, kr + 1).reverse()]);
  const shadow = poly([[px + crater * 0.2, py + 0.8], ...right, [px + wr * 0.18, base]]);
  return { body, snow, shadow };
}

/** Neige le long d'une crête (Iztaccíhuatl, la « femme endormie »), là où elle passe au-dessus de `below`. */
export function ridgeSnow(profile: Profile, x0: number, x1: number, below: number): string {
  let d = '';
  let seg: Pt[] = [];
  const flush = () => {
    if (seg.length > 2) {
      const top = seg.map(([x]): Pt => [x, profile(x)]);
      const bottom = seg
        .slice()
        .reverse()
        .map(([x], i): Pt => [x, profile(x) + 1.3 + (i % 3) * 0.7]);
      d += poly([...top, ...bottom]);
    }
    seg = [];
  };
  for (let x = x0; x <= x1; x += 1) {
    if (profile(x) < below) seg.push([x, profile(x)]);
    else flush();
  }
  flush();
  return d;
}
