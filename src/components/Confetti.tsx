import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

export interface ConfettiHandle {
  burst: (colors: string[], count?: number) => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  w: number;
  h: number;
  color: string;
  life: number;
}

// Confettis en canvas, déclenchés à la révélation des grosses cartes.
export const Confetti = forwardRef<ConfettiHandle>(function Confetti(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const frame = useRef(0);

  const loop = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.current = particles.current.filter((p) => p.life > 0 && p.y < canvas.height / dpr + 40);
    for (const p of particles.current) {
      p.vy += 0.18;
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      p.life -= 1;
      ctx.save();
      ctx.translate(p.x * dpr, p.y * dpr);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.min(1, p.life / 40);
      ctx.fillStyle = p.color;
      ctx.fillRect((-p.w / 2) * dpr, (-p.h / 2) * dpr, p.w * dpr, p.h * dpr * Math.abs(Math.cos(p.rot * 2)) + dpr);
      ctx.restore();
    }
    if (particles.current.length) frame.current = requestAnimationFrame(loop);
  };

  useImperativeHandle(ref, () => ({
    burst: (colors, count = 160) => {
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      for (let i = 0; i < count; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 0.9;
        const speed = 7 + Math.random() * 11;
        particles.current.push({
          x: w / 2 + (Math.random() - 0.5) * 80,
          y: h * 0.55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          rot: Math.random() * Math.PI,
          vr: (Math.random() - 0.5) * 0.3,
          w: 6 + Math.random() * 7,
          h: 3 + Math.random() * 5,
          color: colors[i % colors.length],
          life: 140 + Math.random() * 80,
        });
      }
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(loop);
    },
  }));

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
});
