import type { CSSProperties } from 'react';
import type { SportId } from '../engine/types';
import { SPORTS } from '../data/sports';
import { packScene } from './PackArt';
import { PackScene } from './PackScene';
import { SportIcon } from './SportIcon';

// Badge de collection d'une famille, dans le langage des boosters : le paysage peint du pack de la famille
// dans un médaillon cerclé d'or, l'emblème de la famille au centre (comme le médaillon des cartes) et un ruban
// à son nom. Tant que la famille n'est pas complète, le badge reste éteint, en grisaille.

export function FamilyBadge({ sport, earned, size = 104 }: { sport: SportId; earned: boolean; size?: number }) {
  const scene = packScene('sport', sport);
  const style = {
    '--badge-size': `${size}px`,
    '--badge-near': scene.palette.near,
    '--sport': SPORTS[sport].color,
  } as CSSProperties;
  return (
    <div className={`fbadge${earned ? ' is-earned' : ' is-locked'}`} style={style}>
      <div className="fbadge__medal">
        <PackScene scene={scene} seed={`badge ${sport}`} className="fbadge__scene" shade={false} />
        <span className="fbadge__emblem">
          <SportIcon sport={sport} />
        </span>
      </div>
      <span className="fbadge__ribbon">{SPORTS[sport].short}</span>
    </div>
  );
}
