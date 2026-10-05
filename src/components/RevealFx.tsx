import { useEffect, useRef } from 'react';

// Effets de lumière de la révélation d'une carte spéciale, dessinés dans un canvas :
// - « charge » : des étincelles sont aspirées en spirale vers le centre, de plus en plus vite, autour d'un cœur qui grossit ;
// - « burst » : le cœur explose en gerbe d'étincelles, puis des braises montent doucement derrière la carte.
// Couleur de la rareté (ou arc-en-ciel pour une Prime). Rien n'est dessiné si le joueur a réduit les animations.

export type RevealPhase = 'charge' | 'burst';

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'in' | 'out' | 'ember';
  angle: number;
  radius: number;
}

interface RevealFxProps {
  phase: RevealPhase;
  colors: string[];
  /** 1 pour une Épique, 1.5 pour une Légendaire ou une Prime */
  intensity?: number;
}

export function RevealFx({ phase, colors, intensity = 1 }: RevealFxProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const state = useRef({ phase, start: performance.now(), burstAt: 0 });

  useEffect(() => {
    const s = state.current;
    if (phase === 'burst' && s.phase !== 'burst') s.burstAt = performance.now();
    s.phase = phase;
  }, [phase]);

  useEffect(() => {
    const el = canvas.current;
    if (!el || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = el.getContext('2d');
    if (!ctx) return;
    let width = 0;
    let height = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const resize = () => {
      width = el.clientWidth;
      height = el.clientHeight;
      el.width = Math.round(width * dpr);
      el.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const sparks: Spark[] = [];
    const pick = () => colors[Math.floor(Math.random() * colors.length)];
    let exploded = false;
    let frame = 0;
    let last = performance.now();

    const spawnIn = () => {
      const angle = Math.random() * Math.PI * 2;
      // départ tout autour de l'écran, même sur un téléphone en hauteur (sans partir trop loin du centre)
      const radius = Math.min(width, height) * (0.45 + Math.random() * 0.4) + Math.random() * Math.max(0, Math.abs(height - width)) * 0.35;
      sparks.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1.6 + Math.random() * 0.8, size: 1 + Math.random() * 2.2, color: pick(), kind: 'in', angle, radius });
    };

    const explode = (cx: number, cy: number) => {
      const count = Math.round(170 * intensity);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (260 + Math.random() * 900) * (0.6 + intensity * 0.4);
        sparks.push({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          max: 0.7 + Math.random() * 1.1,
          size: 1.2 + Math.random() * 2.8,
          color: Math.random() < 0.25 ? '#ffffff' : pick(),
          kind: 'out',
          angle,
          radius: 0,
        });
      }
    };

    const spawnEmber = () => {
      sparks.push({
        x: width / 2 + (Math.random() - 0.5) * width * 0.7,
        y: height + 10,
        vx: (Math.random() - 0.5) * 20,
        vy: -(40 + Math.random() * 90),
        life: 0,
        max: 3 + Math.random() * 3,
        size: 1 + Math.random() * 2.4,
        color: pick(),
        kind: 'ember',
        angle: Math.random() * Math.PI * 2,
        radius: 0,
      });
    };

    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const s = state.current;
      const cx = width / 2;
      const cy = height / 2;
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'lighter';

      const charging = s.phase === 'charge';
      const t = (now - s.start) / 1000;
      if (charging) {
        // de plus en plus d'étincelles aspirées à mesure que la révélation approche
        const rate = (30 + Math.min(t, 4) * 45) * intensity;
        for (let i = 0; i < rate * dt; i++) spawnIn();
        // cœur d'énergie qui grossit et palpite
        const core = (18 + Math.min(t, 4) * 12) * (1 + Math.sin(t * 9) * 0.08) * (0.8 + intensity * 0.2);
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, core * 4);
        glow.addColorStop(0, 'rgba(255,255,255,0.95)');
        glow.addColorStop(0.18, colors[0]);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(cx, cy, core * 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else {
        if (!exploded) {
          exploded = true;
          explode(cx, cy);
        }
        const since = (now - s.burstAt) / 1000;
        if (since > 0.4) for (let i = 0; i < 14 * intensity * dt; i++) spawnEmber();
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life += dt;
        if (p.life >= p.max) {
          sparks.splice(i, 1);
          continue;
        }
        const k = p.life / p.max;
        let px: number;
        let py: number;
        let tail = 0;
        if (p.kind === 'in') {
          // spirale vers le centre, qui accélère
          const ease = k * k;
          const r = p.radius * (1 - ease);
          const a = p.angle + ease * 2.4;
          px = cx + Math.cos(a) * r;
          py = cy + Math.sin(a) * r;
          if (!charging) {
            // l'explosion surprend les étincelles en route : elles repartent vers l'extérieur
            p.kind = 'out';
            p.x = px;
            p.y = py;
            p.vx = Math.cos(a) * 600;
            p.vy = Math.sin(a) * 600;
            p.life = 0;
            p.max = 0.6;
          }
          tail = 10 * ease;
          ctx.globalAlpha = Math.min(1, k * 3) * 0.9;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(cx + Math.cos(a - 0.05) * (r + tail * 3), cy + Math.sin(a - 0.05) * (r + tail * 3));
          ctx.stroke();
          continue;
        }
        if (p.kind === 'out') {
          p.vx *= Math.pow(0.12, dt);
          p.vy = p.vy * Math.pow(0.12, dt) + 140 * dt;
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          const speed = Math.hypot(p.vx, p.vy);
          ctx.globalAlpha = (1 - k) * 0.95;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - (p.vx / (speed || 1)) * Math.min(28, speed * 0.04), p.y - (p.vy / (speed || 1)) * Math.min(28, speed * 0.04));
          ctx.stroke();
          continue;
        }
        // braise qui monte en ondulant et scintille
        p.angle += dt * 2;
        p.x += (p.vx + Math.sin(p.angle) * 18) * dt;
        p.y += p.vy * dt;
        const twinkle = 0.55 + Math.sin(p.life * 8 + p.angle) * 0.45;
        ctx.globalAlpha = Math.sin(k * Math.PI) * twinkle * 0.8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, [colors, intensity]);

  return <canvas ref={canvas} className="reveal-fx" aria-hidden="true" />;
}
