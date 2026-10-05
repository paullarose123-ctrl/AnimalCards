import { useEffect, useRef, type PointerEvent } from 'react';
import type { CardFace, OwnedCard } from '../engine/types';
import { Card, type CardSize } from './Card';
import { CardBack } from './CardBack';
import { sfx } from '../audio/sfx';

// Carte en vrai volume : on la fait tourner sur elle-même au doigt ou à la souris (avec de l'élan),
// on voit son dos et sa tranche, le reflet glisse sur la matière selon l'angle. Un double clic la retourne.
// Au repos elle se balance doucement ; sur téléphone, elle suit aussi l'inclinaison de l'appareil.

const THICKNESS = 6; // couches de la tranche

interface Spin3DProps {
  card: CardFace | OwnedCard;
  size?: CardSize;
}

export function Spin3D({ card, size = 'lg' }: Spin3DProps) {
  const stage = useRef<HTMLDivElement>(null);
  const object = useRef<HTMLDivElement>(null);
  const state = useRef({
    rotY: -200, // entrée : la carte arrive en tournoyant
    rotX: 0,
    velY: 14,
    target: 0 as number | null,
    dragging: false,
    lastX: 0,
    lastY: 0,
    lastT: 0,
    moved: 0,
    tiltX: 0,
    tiltY: 0,
    idle: 0,
  });

  useEffect(() => {
    let frame = 0;
    let last = performance.now();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const step = (now: number) => {
      const s = state.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!s.dragging) {
        if (Math.abs(s.velY) > 0.4) {
          // élan après un lancer
          s.rotY += s.velY;
          s.velY *= Math.pow(0.9, dt * 60);
        } else {
          s.velY = 0;
          // la carte se pose sur sa face la plus proche, avec un petit rebond
          if (s.target === null) s.target = Math.round(s.rotY / 180) * 180;
          s.rotY += (s.target - s.rotY) * Math.min(1, dt * 7);
          s.idle += dt;
        }
        s.rotX += (0 - s.rotX) * Math.min(1, dt * 5);
      }
      const sway = reduce || s.dragging ? 0 : Math.sin(s.idle * 1.3) * 6 * Math.min(1, s.idle / 2);
      const ry = s.rotY + sway + s.tiltY;
      const rx = s.rotX + (reduce ? 0 : Math.cos(s.idle * 0.9) * 2) + s.tiltX;
      const el = object.current;
      if (el) {
        el.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        // reflet : il traverse la carte quand elle tourne
        const angle = ((((ry + 90) % 360) + 360) % 360) / 180; // 0..2
        const glare = angle <= 1 ? angle : angle - 1;
        el.style.setProperty('--mx', `${(glare * 120 - 10).toFixed(1)}%`);
        el.style.setProperty('--my', `${(40 - rx * 2).toFixed(1)}%`);
        const facing = Math.abs(Math.cos((ry * Math.PI) / 180));
        el.style.setProperty('--glare', (0.25 + 0.75 * (1 - facing)).toFixed(2));
        stage.current?.style.setProperty('--shadow', (0.35 + 0.65 * facing).toFixed(2));
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);

    // inclinaison du téléphone (Android sans autorisation ; ignoré ailleurs)
    const onTilt = (event: DeviceOrientationEvent) => {
      if (event.gamma == null || event.beta == null) return;
      const s = state.current;
      s.tiltY = Math.max(-18, Math.min(18, event.gamma * 0.6));
      s.tiltX = Math.max(-14, Math.min(14, (45 - event.beta) * 0.35));
    };
    window.addEventListener('deviceorientation', onTilt);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('deviceorientation', onTilt);
    };
  }, []);

  const onDown = (event: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    s.dragging = true;
    s.moved = 0;
    s.velY = 0;
    s.target = null;
    s.lastX = event.clientX;
    s.lastY = event.clientY;
    s.lastT = performance.now();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onMove = (event: PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (!s.dragging) return;
    const dx = event.clientX - s.lastX;
    const dy = event.clientY - s.lastY;
    const now = performance.now();
    const dt = Math.max(1, now - s.lastT);
    s.rotY += dx * 0.6;
    s.rotX = Math.max(-30, Math.min(30, s.rotX - dy * 0.35));
    s.velY = ((dx * 0.6) / dt) * 16;
    s.moved += Math.abs(dx) + Math.abs(dy);
    s.lastX = event.clientX;
    s.lastY = event.clientY;
    s.lastT = now;
  };

  const onUp = () => {
    const s = state.current;
    if (!s.dragging) return;
    s.dragging = false;
    s.idle = 0;
    if (performance.now() - s.lastT > 80) s.velY = 0;
    if (Math.abs(s.velY) > 6) sfx.whoosh();
  };

  const flip = () => {
    const s = state.current;
    s.velY = 0;
    s.target = (Math.round(s.rotY / 180) + 1) * 180;
    s.idle = 0;
    sfx.flip();
  };

  return (
    <div
      ref={stage}
      className="spin3d"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onDoubleClick={flip}
      aria-label="Carte en 3D : fais-la tourner, double-clique pour la retourner"
    >
      <div ref={object} className="spin3d__object">
        <div className="spin3d__face spin3d__front">
          <Card card={card} size={size} />
        </div>
        {Array.from({ length: THICKNESS }, (_, i) => (
          <div key={i} className="spin3d__layer" style={{ transform: `translateZ(${(i - (THICKNESS - 1) / 2) * 0.7}px)` }} />
        ))}
        <div className="spin3d__face spin3d__back">
          <CardBack />
        </div>
      </div>
      <div className="spin3d__shadow" aria-hidden="true" />
    </div>
  );
}
