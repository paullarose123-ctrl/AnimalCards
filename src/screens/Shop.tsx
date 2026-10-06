import { useState } from 'react';
import { useGame } from '../store/game';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { RARITIES, RARITY_ORDER } from '../engine/cards';
import { SHOP_PACKS, iconOdds, habitatOdds, primeOdds, primePool, reverseOdds, sportPack, type PackDef } from '../engine/packs';
import type { SportId } from '../engine/types';
import { PackArt } from '../components/PackArt';
import { Balles } from '../components/Balles';
import { SportIcon } from '../components/SportIcon';
import { Landscape } from '../components/PackScene';
import { SCREEN_SCENES } from '../art/scenes';
import { sfx } from '../audio/sfx';

function percent(value: number): string {
  if (value > 0 && value < 0.0001) return '< 0,01 %';
  return `${(value * 100).toLocaleString('fr-FR', { maximumFractionDigits: value < 0.01 ? 2 : 1 })} %`;
}

function Odds({ pack }: { pack: PackDef }) {
  const total = RARITY_ORDER.reduce((sum, id) => sum + pack.odds[id], 0);
  const prime = primeOdds(pack);
  return (
    <details className="odds">
      <summary>Chances par carte</summary>
      <ul>
        {RARITY_ORDER.slice()
          .reverse()
          .filter((id) => pack.odds[id] > 0)
          .map((id) => (
            <li key={id} className={`rarity-row rarity-row--${id}`}>
              <span className="rarity-dot" />
              <span>{RARITIES[id].name}</span>
              <b>{percent(pack.odds[id] / total)}</b>
            </li>
          ))}
        {prime > 0 && (
          <li className="rarity-row rarity-row--prime">
            <span className="rarity-dot" />
            <span>Version Prime</span>
            <b>{percent(prime)}</b>
          </li>
        )}
        <li className="rarity-row rarity-row--reverse">
          <span className="rarity-dot" />
          <span>Version Reverse</span>
          <b>{percent(reverseOdds(pack))}</b>
        </li>
        {habitatOdds(pack) > 0 && (
          <li className="rarity-row rarity-row--habitat">
            <span className="rarity-dot" />
            <span>Carte Habitat</span>
            <b>{percent(habitatOdds(pack))}</b>
          </li>
        )}
        {iconOdds(pack) > 0 && iconOdds(pack) < 1 && (
          <li className="rarity-row rarity-row--icon">
            <span className="rarity-dot" />
            <span>Icône (espèce disparue)</span>
            <b>{percent(iconOdds(pack))}</b>
          </li>
        )}
      </ul>
      {pack.guaranteed && (
        <p className="small muted">
          {pack.guaranteed.prime
            ? `Dernière carte : une version Prime garantie, parmi les ${primePool(pack).length} individus célèbres.`
            : pack.tone === 'icon'
              ? 'Une seule carte, toujours une Icône : une espèce disparue, la carte la plus rare du jeu.'
              : `Dernière carte : ${RARITIES[pack.guaranteed.min].name} ou mieux garantie.`}
        </p>
      )}
      <p className="small muted">Seules les espèces vedettes existent en version Prime : un individu célèbre (Laïka, Keiko, Sue…).</p>
    </details>
  );
}

function PackTile({ pack }: { pack: PackDef }) {
  const balles = useGame((s) => s.balles);
  const buy = useGame((s) => s.buyPack);
  const affordable = balles >= pack.price;
  return (
    <article className={`pack-tile pack-tile--${pack.tone}`}>
      <PackArt
        tone={pack.tone}
        name={pack.name}
        sport={pack.sport}
        size={pack.size}
        guarantee={pack.guaranteed && (pack.tone === 'icon' ? '1 Icône garantie' : pack.guaranteed.prime ? '1 Prime garantie' : `1 ${RARITIES[pack.guaranteed.min].name} garantie`)}
      />
      <div className="pack-tile__body">
        <h3>{pack.name}</h3>
        <p className="muted small">{pack.tagline}</p>
        <Odds pack={pack} />
        <button
          type="button"
          className="btn btn--primary"
          disabled={!affordable}
          onClick={() => {
            if (buy(pack.id)) sfx.whoosh();
          }}
        >
          Acheter <Balles value={pack.price} />
        </button>
        {!affordable && <p className="small muted">Il te manque {(pack.price - balles).toLocaleString('fr-FR')} crédits.</p>}
      </div>
    </article>
  );
}

export function ShopScreen() {
  const [sport, setSport] = useState<SportId>('felins');
  const balles = useGame((s) => s.balles);
  return (
    <div className="screen">
      <header className="screen__head screen__head--art">
        <Landscape className="screen__art" scene={SCREEN_SCENES.boutique} seed="boutique" />
        <div>
          <p className="eyebrow">Boutique</p>
          <h1>Packs</h1>
          <p className="muted">
            Tu as <Balles value={balles} />. Gagne des crédits en vendant sur le marché, en jouant des duels de records et en remplissant les objectifs.
          </p>
        </div>
      </header>
      <div className="pack-grid">
        {SHOP_PACKS.map((pack) => (
          <PackTile key={pack.id} pack={pack} />
        ))}
      </div>
      <section className="panel">
        <h2>Packs par famille</h2>
        <p className="muted small">3 cartes d’une seule famille, jamais deux fois la même espèce, pour compléter ton album plus vite. Les espèces disparues (Préhistoire comprise) sont des Icônes : à chercher dans le Pack Icônes.</p>
        <div className="sport-tabs" role="tablist" aria-label="Choisir une famille">
          {SPORT_ORDER.filter((id) => id !== 'prehistoire').map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={sport === id}
              className={`sport-tab${sport === id ? ' is-active' : ''}`}
              style={{ ['--sport' as string]: SPORTS[id].color }}
              onClick={() => setSport(id)}
            >
              <SportIcon sport={id} />
              <span>{SPORTS[id].name}</span>
            </button>
          ))}
        </div>
        <div className="pack-grid pack-grid--single">
          <PackTile pack={sportPack(sport, SPORTS[sport].name)} />
        </div>
      </section>
    </div>
  );
}
