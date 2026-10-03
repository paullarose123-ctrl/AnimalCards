import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { geoGraticule10, geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import type { GeometryCollection, Topology } from 'topojson-specification';
import world from 'world-atlas/countries-110m.json';
import { ATHLETES } from '../data/athletes';
import { REGIONS, REGION_BY_ISO, type Region } from '../data/geo';
import { rarityOf } from '../engine/cards';
import type { Athlete } from '../engine/types';
import { useGame } from '../store/game';
import { useUi } from '../store/ui';
import { Card } from './Card';
import { Flag, countryName } from './Flag';

// Carte du monde de la collection : chaque pays emblématique d'une espèce se colore selon la part de ses espèces
// déjà découvertes, avec un repère qui donne leur nombre. Survol : nom et progression ; clic : zoom sur le pays et
// ses cartes en dessous. Molette ou boutons pour zoomer, glisser pour se déplacer.

const W = 960;
const H = 500;

const projection = geoNaturalEarth1().fitExtent(
  [
    [6, 6],
    [W - 6, H - 6],
  ],
  { type: 'Sphere' },
);
const pathOf = geoPath(projection);
const topology = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const COUNTRIES = (feature(topology, topology.objects.countries) as FeatureCollection<Geometry, { name: string }>).features;
const SPHERE = pathOf({ type: 'Sphere' }) ?? '';
const GRATICULE = pathOf(geoGraticule10()) ?? '';
// quelques territoires du tracé n'ont pas d'identifiant ISO (Kosovo, Chypre du Nord…) : clé par position
const SHAPES = COUNTRIES.map((f, i) => ({ key: `${f.id ?? 'x'}-${i}`, id: f.id == null ? '' : String(f.id), d: pathOf(f) ?? '', feature: f }));

const SPECIES_BY_REGION: Record<string, Athlete[]> = Object.fromEntries(
  REGIONS.map((region) => [
    region.key,
    ATHLETES.filter((a) => region.codes.includes(a.country)).sort(
      (a, b) => rarityOf(b).order - rarityOf(a).order || b.fame - a.fame || a.last.localeCompare(b.last, 'fr'),
    ),
  ]),
);

const regionName = (region: Region) => region.name ?? countryName(region.codes[0]);

interface View {
  x: number;
  y: number;
  w: number;
}

const FULL: View = { x: 0, y: 0, w: W };
const MIN_W = W / 14;

function clampView(v: View): View {
  const w = Math.min(W, Math.max(MIN_W, v.w));
  const h = (w * H) / W;
  return {
    w,
    x: Math.min(W - w * 0.5, Math.max(-w * 0.5, v.x)),
    y: Math.min(H - h * 0.5, Math.max(-h * 0.5, v.y)),
  };
}

/** Cadre qui montre une région : le contour du pays, sinon un carré autour de son repère. */
function viewFor(region: Region): View {
  const shape = region.iso ? SHAPES.find((s) => s.id === region.iso) : undefined;
  let [[x0, y0], [x1, y1]] = shape
    ? pathOf.bounds(shape.feature as Feature)
    : (() => {
        const [px, py] = projection(region.at) ?? [W / 2, H / 2];
        return [
          [px - 40, py - 30],
          [px + 40, py + 30],
        ];
      })();
  // pays à cheval sur plusieurs continents (États-Unis, Russie, France…) : on centre sur le repère
  if (x1 - x0 > W * 0.5 || region.key === 'FR' || region.key === 'NO') {
    const [px, py] = projection(region.at) ?? [W / 2, H / 2];
    const half = region.key === 'RU' || region.key === 'US' ? 150 : 45;
    [[x0, y0], [x1, y1]] = [
      [px - half, py - half * 0.6],
      [px + half, py + half * 0.6],
    ];
  }
  const pad = 1.6;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const w = Math.max((x1 - x0) * pad, ((y1 - y0) * pad * W) / H, MIN_W * 1.6);
  const h = (w * H) / W;
  return clampView({ x: cx - w / 2, y: cy - h / 2, w });
}

export function WorldMap() {
  const discovered = useGame((s) => s.discovered);
  const collection = useGame((s) => s.collection);
  const openDetail = useUi((s) => s.openDetail);
  const [selected, setSelected] = useState<Region | null>(null);
  const [hover, setHover] = useState<{ region: Region; x: number; y: number } | null>(null);
  const [view, setView] = useState<View>(FULL);
  const viewRef = useRef(view);
  const svgRef = useRef<SVGSVGElement>(null);
  const frame = useRef(0);
  const drag = useRef<{ x: number; y: number; view: View; moved: boolean } | null>(null);
  // largeur affichée de la carte : sur un écran étroit, les repères grossissent pour rester faciles à toucher
  const [screenWidth, setScreenWidth] = useState(W);

  viewRef.current = view;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const observer = new ResizeObserver(() => setScreenWidth(svg.getBoundingClientRect().width || W));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);

  const stats = useMemo(() => {
    const out: Record<string, { done: number; total: number }> = {};
    for (const region of REGIONS) {
      const list = SPECIES_BY_REGION[region.key];
      out[region.key] = { done: list.filter((a) => discovered[a.id]).length, total: list.length };
    }
    return out;
  }, [discovered]);
  const explored = REGIONS.filter((r) => stats[r.key].done > 0).length;
  const complete = REGIONS.filter((r) => stats[r.key].total > 0 && stats[r.key].done === stats[r.key].total).length;

  /** Glisse doucement vers un cadre. */
  const animateTo = useCallback((target: View) => {
    cancelAnimationFrame(frame.current);
    const from = viewRef.current;
    const start = performance.now();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const step = (now: number) => {
      const t = reduce ? 1 : Math.min(1, (now - start) / 420);
      const e = 1 - (1 - t) ** 3;
      setView({ x: from.x + (target.x - from.x) * e, y: from.y + (target.y - from.y) * e, w: from.w + (target.w - from.w) * e });
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const select = (region: Region | null) => {
    setSelected(region);
    animateTo(region ? viewFor(region) : FULL);
  };

  /** Zoom autour d'un point du dessin (coordonnées de la carte). */
  const zoomAt = useCallback((px: number, py: number, factor: number) => {
    const v = viewRef.current;
    const w = Math.min(W, Math.max(MIN_W, v.w * factor));
    const k = w / v.w;
    setView(clampView({ w, x: px - (px - v.x) * k, y: py - (py - v.y) * k }));
  }, []);

  const toMap = (clientX: number, clientY: number) => {
    const rect = svgRef.current!.getBoundingClientRect();
    const v = viewRef.current;
    const h = (v.w * H) / W;
    return [v.x + ((clientX - rect.left) / rect.width) * v.w, v.y + ((clientY - rect.top) / rect.height) * h] as const;
  };

  // molette : zoom sur le pointeur (écouteur non passif pour ne pas faire défiler la page)
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return undefined;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cancelAnimationFrame(frame.current);
      const [px, py] = toMap(event.clientX, event.clientY);
      zoomAt(px, py, event.deltaY > 0 ? 1.18 : 1 / 1.18);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    drag.current = { x: event.clientX, y: event.clientY, view: viewRef.current, moved: false };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const d = drag.current;
    if (d) {
      const dx = event.clientX - d.x;
      const dy = event.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 5) {
        d.moved = true;
        svgRef.current?.setPointerCapture(event.pointerId);
        cancelAnimationFrame(frame.current);
        setHover(null);
      }
      if (d.moved) {
        const rect = svgRef.current!.getBoundingClientRect();
        const scale = d.view.w / rect.width;
        setView(clampView({ w: d.view.w, x: d.view.x - dx * scale, y: d.view.y - dy * scale }));
      }
    }
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drag.current?.moved) svgRef.current?.releasePointerCapture(event.pointerId);
    // un glisser ne doit pas valoir un clic : on garde l'info le temps que le clic arrive
    window.setTimeout(() => {
      drag.current = null;
    }, 0);
  };

  const clickRegion = (region: Region) => {
    if (drag.current?.moved) return;
    select(selected?.key === region.key ? null : region);
  };

  const showHover = (region: Region, event: ReactPointerEvent<Element>) => {
    if (drag.current?.moved) return;
    const box = svgRef.current!.parentElement!.getBoundingClientRect();
    setHover({ region, x: event.clientX - box.left, y: event.clientY - box.top });
  };

  const h = (view.w * H) / W;
  // les repères gardent la même taille à l'écran quel que soit le zoom, un peu plus gros sur téléphone
  const markerScale = (view.w / W) * Math.min(2, Math.max(1, 720 / screenWidth));
  const zoomed = view.w < W * 0.98;

  const fillOf = (region: Region | undefined) => {
    if (!region) return undefined;
    const { done, total } = stats[region.key];
    if (!total) return undefined;
    if (done === total) return 'var(--map-complete)';
    if (!done) return 'var(--map-todo)';
    return `color-mix(in srgb, var(--map-progress) ${Math.round(35 + (65 * done) / total)}%, var(--map-todo))`;
  };

  const species = selected ? SPECIES_BY_REGION[selected.key] : [];

  return (
    <section className="worldmap" aria-label="Carte du monde de la collection">
      <div className="worldmap__head">
        <div>
          <p className="muted small">
            {explored} pays et régions explorés sur {REGIONS.length} · {complete} complété{complete > 1 ? 's' : ''}. Touche un pays pour voir ses espèces.
          </p>
        </div>
        <ul className="worldmap__legend" aria-label="Légende">
          <li>
            <i style={{ background: 'var(--map-todo)' }} /> À découvrir
          </li>
          <li>
            <i style={{ background: 'var(--map-progress)' }} /> En cours
          </li>
          <li>
            <i style={{ background: 'var(--map-complete)' }} /> Complet
          </li>
        </ul>
      </div>

      <div className={`worldmap__frame${zoomed ? ' is-zoomed' : ''}`}>
        <svg
          ref={svgRef}
          className="worldmap__svg"
          viewBox={`${view.x.toFixed(2)} ${view.y.toFixed(2)} ${view.w.toFixed(2)} ${h.toFixed(2)}`}
          role="img"
          aria-label="Carte du monde des espèces"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={() => setHover(null)}
        >
          <defs>
            <radialGradient id="worldmap-ocean" cx="50%" cy="45%" r="65%">
              <stop offset="0" stopColor="#1d4b5a" />
              <stop offset="1" stopColor="#0c2430" />
            </radialGradient>
          </defs>
          <path d={SPHERE} className="worldmap__ocean" fill="url(#worldmap-ocean)" />
          <path d={GRATICULE} className="worldmap__graticule" />
          {SHAPES.map((shape) => {
            const region = REGION_BY_ISO[shape.id];
            const fill = fillOf(region);
            const active = region && selected?.key === region.key;
            return (
              <path
                key={shape.key}
                d={shape.d}
                className={`worldmap__land${region ? ' has-species' : ''}${active ? ' is-active' : ''}`}
                style={fill ? { fill } : undefined}
                onPointerMove={region ? (event) => showHover(region, event) : undefined}
                onPointerLeave={region ? () => setHover(null) : undefined}
                onClick={region ? () => clickRegion(region) : undefined}
              />
            );
          })}
          {REGIONS.map((region) => {
            const [x, y] = projection(region.at) ?? [0, 0];
            const { done, total } = stats[region.key];
            if (!total) return null;
            const r = 6 + Math.sqrt(total) * 1.6;
            const state = done === total ? 'is-complete' : done ? 'is-progress' : 'is-todo';
            const special = !region.iso;
            return (
              <g
                key={region.key}
                className={`worldmap__marker ${state}${selected?.key === region.key ? ' is-active' : ''}`}
                transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${markerScale})`}
                onPointerMove={(event) => showHover(region, event)}
                onPointerLeave={() => setHover(null)}
                onClick={() => clickRegion(region)}
              >
                <circle r={r + 3} className="worldmap__halo" />
                <circle r={r} className="worldmap__dot" />
                {/* anneau de progression */}
                <circle
                  r={r + 1.6}
                  className="worldmap__ring"
                  pathLength={100}
                  strokeDasharray={`${(done / total) * 100} 100`}
                  transform="rotate(-90)"
                />
                <text dy="0.35em" className="worldmap__count">
                  {total}
                </text>
                {special && (
                  <text y={r + 13} className="worldmap__label">
                    {regionName(region)}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {hover && (
          <div className="worldmap__tip" style={{ left: hover.x, top: hover.y }} role="tooltip">
            <Flag code={hover.region.codes[0]} className="worldmap__tipflag" />
            <b>{regionName(hover.region)}</b>
            <span>
              {stats[hover.region.key].done}/{stats[hover.region.key].total} espèces
            </span>
          </div>
        )}

        <div className="worldmap__zoom">
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Zoomer" onClick={() => animateTo(clampView({ ...view, w: view.w / 1.6, x: view.x + view.w * 0.1875, y: view.y + h * 0.1875 }))}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5 V19 M5 12 H19" />
            </svg>
          </button>
          <button type="button" className="icon-btn icon-btn--sm" aria-label="Dézoomer" onClick={() => animateTo(clampView({ ...view, w: view.w * 1.6, x: view.x - view.w * 0.3, y: view.y - h * 0.3 }))}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12 H19" />
            </svg>
          </button>
          <button type="button" className="btn btn--ghost btn--xs" onClick={() => select(null)} disabled={!zoomed && !selected}>
            Monde
          </button>
        </div>
      </div>

      {selected ? (
        <div className="worldmap__region">
          <div className="worldmap__regionhead">
            <Flag code={selected.codes[0]} className="worldmap__flag" />
            <div>
              <h3>{regionName(selected)}</h3>
              <p className="muted small">
                {stats[selected.key].done}/{stats[selected.key].total} espèce{stats[selected.key].total > 1 ? 's' : ''} découverte
                {stats[selected.key].done > 1 ? 's' : ''}
              </p>
            </div>
            <span className="meter">
              <span className="meter__fill" style={{ width: `${(stats[selected.key].done / stats[selected.key].total) * 100}%` }} />
            </span>
          </div>
          <div className="card-grid card-grid--album">
            {species.map((athlete) => {
              const have = !!discovered[athlete.id];
              const mine = collection.find((c) => c.athleteId === athlete.id);
              const card = mine ?? { athleteId: athlete.id, variant: 'base' as const };
              return (
                <div key={athlete.id} className="card-cell">
                  <Card card={card} size="xs" locked={!have} onClick={() => openDetail({ card })} />
                  {!have && <span className="album-name">{athlete.last}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <ul className="worldmap__top" aria-label="Pays aux plus nombreuses espèces">
          {REGIONS.slice()
            .sort((a, b) => stats[b.key].total - stats[a.key].total)
            .slice(0, 10)
            .map((region) => (
              <li key={region.key}>
                <button type="button" onClick={() => select(region)}>
                  <Flag code={region.codes[0]} className="worldmap__chipflag" />
                  <span>{regionName(region)}</span>
                  <small>
                    {stats[region.key].done}/{stats[region.key].total}
                  </small>
                </button>
              </li>
            ))}
        </ul>
      )}
    </section>
  );
}
