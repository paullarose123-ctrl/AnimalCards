import { memo, useMemo, type CSSProperties } from 'react';

// Lucioles qui dérivent et clignotent doucement dans le sous-bois, derrière le contenu.
// Positions et trajets tirés une fois pour toutes (pas de rendu à chaque image : tout est en CSS).

const COUNT = 22;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

export const Fireflies = memo(function Fireflies() {
  const flies = useMemo(
    () =>
      Array.from({ length: COUNT }, () => {
        const px = (n: number) => `${Math.round(n)}px`;
        return {
          left: `${rand(2, 98).toFixed(1)}%`,
          top: `${rand(35, 98).toFixed(1)}%`,
          '--d': `${rand(10, 22).toFixed(1)}s`,
          '--b': `${rand(2.4, 5).toFixed(1)}s`,
          '--delay': `${rand(-20, 0).toFixed(1)}s`,
          '--o': rand(0.45, 0.95).toFixed(2),
          '--x1': px(rand(-50, 50)),
          '--y1': px(rand(-60, -10)),
          '--x2': px(rand(-70, 70)),
          '--y2': px(rand(-110, -40)),
          '--x3': px(rand(-60, 60)),
          '--y3': px(rand(-160, -70)),
          transform: `scale(${rand(0.6, 1.2).toFixed(2)})`,
        } as CSSProperties;
      }),
    [],
  );
  return (
    <div className="fireflies" aria-hidden="true">
      {flies.map((style, i) => (
        <i key={i} className="firefly" style={style} />
      ))}
    </div>
  );
});
