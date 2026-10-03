import { ATHLETES } from '../data/athletes';
import { SPORTS, SPORT_ORDER } from '../data/sports';
import { Card } from '../components/Card';
import { Flag, FLAG_CODES } from '../components/Flag';
import { SportIcon } from '../components/SportIcon';
import { RARITIES, RECORD_START, isIcon, rarityOf } from '../engine/cards';
import { FREE_PACK, SHOP_PACKS, sportPack } from '../engine/packs';
import { PackArt } from '../components/PackArt';
import { CardBack } from '../components/CardBack';

// Page de contrôle visuel (#galerie) : un échantillon de cartes, les emblèmes des familles et tous les drapeaux.
const SAMPLE = ['lion', 'tigre', 'elephant', 'loup', 'orque', 'requin-blanc', 'panda', 'gorille', 'aigle-royal', 'crocodile-du-nil', 'chien', 'chat', 'axolotl', 'pieuvre', 'kangourou', 'fourmi'];
// une espèce par famille, pour vérifier les emblèmes et les noms longs
const FAMILIES = ['manul', 'fennec', 'ours-lippu', 'aye-aye', 'okapi', 'saiga', 'rat-taupe-nu', 'ornithorynque', 'narval', 'raie-manta', 'coelacanthe', 'harfang', 'macareux', 'cameleon', 'phyllobate', 'mante-religieuse', 'crevette-mante', 'alpaga', 'rhinoceros-noir-de-l-ouest'];

export function Gallery() {
  const sample = SAMPLE.map((id) => ATHLETES.find((a) => a.id === id)!).filter(Boolean);
  // une espèce actuelle par rareté (bronze → légende), pour comparer les matières
  const tiers = (['commune', 'peu-commune', 'rare', 'epique', 'legendaire'] as const)
    .map((id) => ATHLETES.find((a) => !isIcon(a) && !a.mythe && rarityOf(a).id === id))
    .filter((a) => a !== undefined);
  return (
    <div style={{ padding: 24, display: 'grid', gap: 32 }}>
      <style>{'.gallery-icons svg { width: 40px; height: 40px; }'}</style>
      <section className="gallery-icons" style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {SPORT_ORDER.map((id) => (
          <figure key={id} style={{ margin: 0, width: 64, textAlign: 'center', fontSize: 10, color: SPORTS[id].color }}>
            <SportIcon sport={id} />
            <div>{SPORTS[id].short}</div>
          </figure>
        ))}
      </section>
      <section id="familles" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {FAMILIES.map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'base' }} size="md" />
        ))}
      </section>
      <div style={{ width: 210, aspectRatio: '100 / 140' }}>
        <CardBack />
      </div>
      <section id="mythes" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {ATHLETES.filter((a) => a.mythe).map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section id="apercu" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {['crocodile-du-nil', 'alligator', 'chien', 'requin-baleine', 't-rex', 'triceratops', 'mammouth', 'smilodon', 'mythe-dragon', 'mythe-pegase', 'mythe-griffon', 'mythe-nessie'].map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section id="reverse" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {['guepard', 'herisson', 'requin-marteau', 'dodo', 'abeille'].map((id) => (
          <Card key={id} card={{ athleteId: id, variant: 'reverse' }} size="lg" />
        ))}
      </section>
      <section id="icones" style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {ATHLETES.filter((a) => a.retired && !a.mythe).map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section id="boosters" style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {[FREE_PACK, ...SHOP_PACKS, ...SPORT_ORDER.map((id) => sportPack(id, SPORTS[id].name))].map((pack) => (
          <div key={pack.id} style={{ width: 190 }}>
            <PackArt
              tone={pack.tone}
              name={pack.name}
              sport={pack.sport}
              size={pack.size}
              guarantee={pack.guaranteed && (pack.guaranteed.prime ? '1 Prime garantie' : `1 ${RARITIES[pack.guaranteed.min].name} garantie`)}
            />
          </div>
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        {tiers.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="lg" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 20 }}>
        <Card card={{ athleteId: 'lion', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 'tigre', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 't-rex', variant: 'base' }} size="lg" />
        <Card card={{ athleteId: 'chien', variant: 'prime' }} size="lg" />
        <Card card={{ athleteId: 'guepard', variant: 'base', record: RECORD_START }} size="lg" />
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {sample.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="md" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {sample.map((a) => (
          <Card key={a.id} card={{ athleteId: a.id, variant: 'base' }} size="sm" />
        ))}
      </section>
      <section style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {[...FLAG_CODES, 'GB-XYZ'].map((code) => (
          <figure key={code} style={{ margin: 0, width: 64, textAlign: 'center', fontSize: 10, color: '#9ba5bb' }}>
            <Flag code={code} className="gallery-flag" />
            {code}
          </figure>
        ))}
      </section>
    </div>
  );
}
