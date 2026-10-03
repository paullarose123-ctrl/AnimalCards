import { CARD_BACK_SCENE } from '../art/scenes';
import { Logo } from './Logo';
import { PackScene } from './PackScene';

/** Dos des cartes : une petite affiche (pleine lune et constellations), le logo sur le premier plan et un filet doré. */
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <div className={`card-back ${className}`}>
      <PackScene scene={CARD_BACK_SCENE} seed="dos de carte" className="card-back__scene" />
      <div className="card-back__holo" />
      <div className="card-back__crest">
        <Logo />
        <small>Série 1</small>
      </div>
      <div className="card-back__frame" />
    </div>
  );
}
