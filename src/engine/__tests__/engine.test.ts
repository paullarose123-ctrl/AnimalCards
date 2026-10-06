import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { baseValueOf, canBePrime, rarityOf } from '../cards';
import { FREE_ODDS, FREE_PACK, NO_DUPE_WINDOW, SHOP_PACKS, openPack, primeOdds, sportPack } from '../packs';
import { advanceMarket, createAiListing, createMarket, createMyListing, marketPrice, netAfterTax, TARGET_LISTINGS, type MarketState } from '../market';
import { MAX_QUESTIONS, RECORDS, ROUNDS, aiSkill, autoTeamFrom, classeOf, compare, createDuel, drawRecords, duelResult, formatRecordValue, playDuelRound, recordValue, type DuelCard } from '../duel';
import { mulberry32 } from '../random';
import { SPORTS } from '../../data/sports';
import type { SportId } from '../types';

const MINUTE = 60_000;

describe('boosters', () => {
  it('donne le bon nombre de cartes, triées de la moins rare à la plus rare', () => {
    const rng = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const cards = openPack(FREE_PACK, rng);
      expect(cards).toHaveLength(5);
      const orders = cards.map((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).order);
      expect(orders).toEqual([...orders].sort((a, b) => a - b));
    }
  });

  it('ne redonne aucune espèce sur 7 boosters d’affilée', () => {
    const rng = mulberry32(99);
    const packs = [FREE_PACK, ...SHOP_PACKS];
    let recent: string[][] = [];
    for (let i = 0; i < 400; i++) {
      const pack = packs[i % packs.length];
      const ids = openPack(pack, rng, new Set(recent.flat())).map((c) => c.athleteId);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(recent.flat()).not.toContain(id);
      recent = [...recent, ids].slice(-(NO_DUPE_WINDOW - 1));
    }
  });

  it('donne 3 espèces différentes dans chaque pack de famille, même les plus petites familles', () => {
    const rng = mulberry32(31);
    for (const sport of Object.keys(SPORTS) as SportId[]) {
      const pack = sportPack(sport, SPORTS[sport].name);
      for (let i = 0; i < 400; i++) {
        const cards = openPack(pack, rng);
        expect(cards).toHaveLength(3);
        expect(new Set(cards.map((c) => c.athleteId)).size).toBe(3);
        for (const card of cards) expect(ATHLETES_BY_ID[card.athleteId].sport).toBe(sport);
      }
    }
  });

  it('respecte la carte garantie des packs payants', () => {
    const rng = mulberry32(7);
    const elite = SHOP_PACKS.find((p) => p.id === 'elite')!;
    const legende = SHOP_PACKS.find((p) => p.id === 'legende')!;
    const prime = SHOP_PACKS.find((p) => p.id === 'prime')!;
    for (let i = 0; i < 100; i++) {
      // une Prime tirée en plus passe toujours en dernier : on cherche la garantie dans tout le pack
      expect(openPack(elite, rng).some((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).order >= 3)).toBe(true);
      expect(openPack(legende, rng).some((c) => rarityOf(ATHLETES_BY_ID[c.athleteId]).id === 'legendaire')).toBe(true);
      const primePack = openPack(prime, rng);
      expect(primePack.at(-1)!.variant).toBe('prime');
    }
  });

  it('sort environ une carte sur 20 en version Reverse, plus chère que la classique', () => {
    const rng = mulberry32(2026);
    let reverse = 0;
    let total = 0;
    for (let i = 0; i < 4000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (card.variant === 'reverse') reverse += 1;
      }
    }
    expect(reverse / total).toBeGreaterThan(0.04);
    expect(reverse / total).toBeLessThan(0.06);
    const zebre = ATHLETES_BY_ID.zebre;
    expect(baseValueOf(zebre, 'reverse')).toBeGreaterThan(baseValueOf(zebre));
  });

  it('sort une carte Habitat environ une fois sur 40, sans toucher à la carte garantie', () => {
    const rng = mulberry32(99);
    let habitats = 0;
    let total = 0;
    for (let i = 0; i < 4000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (ATHLETES_BY_ID[card.athleteId].habitat) habitats += 1;
      }
    }
    expect(habitats / total).toBeGreaterThan(0.018);
    expect(habitats / total).toBeLessThan(0.032);
    // la carte garantie reste un animal Légendaire ; un Habitat tiré en plus peut être classé après elle
    const legende = SHOP_PACKS.find((p) => p.id === 'legende')!;
    for (let i = 0; i < 300; i++) {
      const athletes = openPack(legende, rng).map((card) => ATHLETES_BY_ID[card.athleteId]);
      expect(athletes.some((athlete) => !athlete.habitat && rarityOf(athlete).id === 'legendaire')).toBe(true);
    }
  });

  it('rend les Icônes ultra rares hors de leur pack (environ 1 carte sur 1 000)', () => {
    const rng = mulberry32(7);
    const isIconCard = (card: { athleteId: string }) => {
      const athlete = ATHLETES_BY_ID[card.athleteId];
      return !!athlete.retired && !athlete.habitat;
    };
    let icons = 0;
    let total = 0;
    for (let i = 0; i < 8000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (isIconCard(card)) icons += 1;
      }
    }
    expect(icons / total).toBeGreaterThan(0.0004);
    expect(icons / total).toBeLessThan(0.0018);
    // le Pack Icônes contient une seule carte : toujours une Icône
    const single = SHOP_PACKS.find((p) => p.id === 'icones')!;
    for (let i = 0; i < 200; i++) {
      const cards = openPack(single, rng);
      expect(cards).toHaveLength(1);
      expect(isIconCard(cards[0])).toBe(true);
    }
    expect(Math.max(...SHOP_PACKS.map((p) => p.price))).toBe(single.price);
    // le Pack Icônes et le Pack Préhistoire, eux, ne contiennent que des Icônes (ou un Habitat)
    const iconPack = SHOP_PACKS.find((p) => p.id === 'icones')!;
    const prehistoire = sportPack('prehistoire', 'Préhistoire');
    for (let i = 0; i < 300; i++) {
      for (const pack of [iconPack, prehistoire]) {
        for (const card of openPack(pack, rng)) expect(isIconCard(card) || !!ATHLETES_BY_ID[card.athleteId].habitat).toBe(true);
      }
    }
  });

  it('donne surtout des individus d’espèces vedettes dans le Pack Prime', () => {
    const rng = mulberry32(3);
    const prime = SHOP_PACKS.find((p) => p.id === 'prime')!;
    let famous = 0;
    for (let i = 0; i < 1000; i++) {
      const card = openPack(prime, rng).at(-1)!;
      if (rarityOf(ATHLETES_BY_ID[card.athleteId]).order >= 3) famous += 1;
    }
    expect(famous / 1000).toBeGreaterThan(0.75);
    expect(baseValueOf(ATHLETES_BY_ID.mouton, 'prime')).toBeGreaterThanOrEqual(50_000);
  });

  it('ne donne une version Prime qu’aux espèces vedettes', () => {
    const rng = mulberry32(99);
    const legends = ATHLETES.filter(canBePrime).map((a) => a.id);
    expect(legends).toEqual(expect.arrayContaining(['lion', 't-rex', 'loup', 'husky', 'guepard']));
    expect(legends).not.toContain('fennec');
    const isLegendPrime = (card: { athleteId: string; variant: string }) => card.variant !== 'prime' || canBePrime(ATHLETES_BY_ID[card.athleteId]);
    const packs = [FREE_PACK, ...SHOP_PACKS];
    for (let i = 0; i < 3000; i++) expect(openPack(packs[i % packs.length], rng).every(isLegendPrime)).toBe(true);
    for (let i = 0; i < 2000; i++) expect(isLegendPrime(createAiListing(rng, 0, []).card)).toBe(true);
    // une Prime est bien plus rare qu'une Légendaire
    expect(primeOdds(FREE_PACK)).toBeLessThan(FREE_ODDS.legendaire / 100 / 5);
  });

  it('rend les légendaires vraiment rares dans le booster gratuit', () => {
    const rng = mulberry32(2024);
    let legendary = 0;
    let total = 0;
    let lion = 0;
    let crocodile = 0;
    for (let i = 0; i < 20_000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (rarityOf(ATHLETES_BY_ID[card.athleteId]).id === 'legendaire') legendary += 1;
        if (card.athleteId === 'lion') lion += 1;
        if (card.athleteId === 'crocodile-du-nil') crocodile += 1;
      }
    }
    const share = legendary / total;
    expect(share).toBeGreaterThan(0.005);
    expect(share).toBeLessThan(0.011);
    // plus une espèce est célèbre, plus sa carte est rare : le lion sort bien moins souvent que le crocodile du Nil
    expect(lion).toBeLessThan(crocodile);
  });
});

describe('marché des transferts', () => {
  const t0 = Date.UTC(2026, 8, 29, 12);

  it('garde un marché rempli en permanence, même après une longue absence', () => {
    const rng = mulberry32(1);
    const market = createMarket(t0, rng);
    expect(market.listings).toHaveLength(TARGET_LISTINGS);
    const { state } = advanceMarket(market, t0 + 8 * 60 * MINUTE, rng);
    expect(state.listings.length).toBe(TARGET_LISTINGS);
    expect(state.listings.every((l) => l.expiresAt > t0 + 8 * 60 * MINUTE)).toBe(true);
    expect(state.news.length).toBeGreaterThan(0);
  });

  it('vend vite une carte proposée sous la cote, et pas une carte hors de prix', () => {
    const rng = mulberry32(99);
    const card = { uid: 'u1', athleteId: 'zebre', variant: 'base' as const, obtainedAt: t0 };
    const price = marketPrice(card, t0);
    let sold = 0;
    let overpricedSold = 0;
    for (let i = 0; i < 40; i++) {
      const cheap: MarketState = { ...createMarket(t0, rng), myListings: [createMyListing(card, Math.round(price * 0.6), Math.round(price * 0.9), 15, t0)] };
      if (advanceMarket(cheap, t0 + 15 * MINUTE, rng).events.some((e) => e.type === 'sold')) sold += 1;
      const pricey: MarketState = { ...createMarket(t0, rng), myListings: [createMyListing(card, price * 3, price * 4, 15, t0)] };
      if (advanceMarket(pricey, t0 + 15 * MINUTE, rng).events.some((e) => e.type === 'sold')) overpricedSold += 1;
    }
    expect(sold).toBeGreaterThan(30);
    expect(overpricedSold).toBeLessThan(4);
  });

  it('prélève la taxe de 5 % sur les ventes', () => {
    expect(netAfterTax(10_000)).toBe(9_500);
  });

  it('rembourse le joueur quand une IA surenchérit', () => {
    const rng = mulberry32(5);
    const market = createMarket(t0, rng);
    const target = market.listings[0];
    const cheapBid = { ...target, currentBid: 50, bidder: 'me' as const, bidCount: 1, expiresAt: t0 + 30 * MINUTE };
    let refunded = false;
    for (let i = 0; i < 20 && !refunded; i++) {
      const { events } = advanceMarket({ ...market, listings: [cheapBid, ...market.listings.slice(1)] }, t0 + 10 * MINUTE, mulberry32(i));
      refunded = events.some((e) => e.type === 'outbid' && e.refund === 50);
    }
    expect(refunded).toBe(true);
  });
});

describe('duel de records', () => {
  const team = (ids: string[]): DuelCard[] => ids.map((id, i) => ({ uid: `u${i}`, athleteId: id, variant: 'base' }));

  it('se joue en 5 manches, chaque animal une seule fois, et désigne un résultat', () => {
    const rng = mulberry32(3);
    let duel = createDuel(team(['herisson', 'zebre', 'gnou', 'castor', 'lapin']), 10, rng);
    expect(new Set(duel.records).size).toBe(ROUNDS);
    for (let round = 0; round < ROUNDS; round++) {
      expect(duel.finished).toBe(false);
      duel = playDuelRound(duel, round, rng).state;
    }
    expect(duel.finished).toBe(true);
    expect(duel.me.used).toEqual([0, 1, 2, 3, 4]);
    expect(new Set(duel.opp.used).size).toBe(ROUNDS);
    expect(duel.me.score + duel.opp.score).toBeLessThanOrEqual(ROUNDS);
    expect(['win', 'draw', 'loss']).toContain(duelResult(duel));
  });

  it('compare les vraies mesures : l’éléphant est plus lourd que la souris, qui est plus légère', () => {
    const elephant = { athleteId: 'elephant', variant: 'base' as const };
    const souris = { athleteId: 'souris', variant: 'base' as const };
    expect(compare('lourd', recordValue(elephant, 'lourd'), recordValue(souris, 'lourd'))).toBe('me');
    expect(compare('leger', recordValue(elephant, 'leger'), recordValue(souris, 'leger'))).toBe('opp');
    expect(compare('rare', recordValue(elephant, 'rare'), recordValue(souris, 'rare'))).toBe('me');
    // une mesure inconnue perd la manche
    expect(compare('vieux', null, 3)).toBe('opp');
    expect(compare('vieux', null, null)).toBe('draw');
    expect(formatRecordValue({ athleteId: 'thylacine', variant: 'base' }, 'rare')).toBe('Éteint');
  });

  it('varie les questions : 5 différentes, dont au plus deux questions oui/non', () => {
    const rng = mulberry32(12);
    for (let i = 0; i < 200; i++) {
      const records = drawRecords(rng);
      expect(new Set(records).size).toBe(ROUNDS);
      expect(records.filter((id) => RECORDS[id].question).length).toBeLessThanOrEqual(MAX_QUESTIONS);
    }
  });

  it('répond juste aux questions de continent et de classe', () => {
    const face = (id: string) => ({ athleteId: id, variant: 'base' as const });
    expect(recordValue(face('lion'), 'afrique')).toBe(1);
    expect(recordValue(face('lion'), 'asie')).toBe(0);
    expect(recordValue(face('kangourou'), 'oceanie')).toBe(1);
    expect(recordValue(face('panda'), 'asie')).toBe(1);
    expect(recordValue(face('bison'), 'amerique')).toBe(1);
    expect(recordValue(face('orque'), 'afrique')).toBe(0);
    // espèces de plusieurs continents : le chat vit partout, le loup en Europe, en Asie et en Amérique
    expect(ATHLETES_BY_ID.chat.country).toBe('XW');
    expect(recordValue(face('chat'), 'oceanie')).toBe(1);
    expect(recordValue(face('loup'), 'europe')).toBe(1);
    expect(recordValue(face('loup'), 'afrique')).toBe(0);
    expect(classeOf(ATHLETES_BY_ID.dauphin)).toBe('mammifere');
    expect(classeOf(ATHLETES_BY_ID.poule)).toBe('oiseau');
    expect(classeOf(ATHLETES_BY_ID['requin-blanc'])).toBe('poisson');
    expect(classeOf(ATHLETES_BY_ID.mammouth)).toBe('mammifere');
    expect(classeOf(ATHLETES_BY_ID['t-rex'])).toBe('reptile');
    expect(formatRecordValue(face('aigle-royal'), 'oiseau')).toBe('Oui');
  });

  it('fait jouer un ami avec les animaux de sa vitrine', () => {
    const rng = mulberry32(5);
    const duel = createDuel(team(['herisson', 'zebre', 'gnou', 'castor', 'lapin']), 10, rng, 'Moi', {
      pseudo: 'Ami',
      cards: [{ athleteId: 'lion', variant: 'prime' }, { athleteId: 'habitat-amazonie', variant: 'base' }, { athleteId: 'koala', variant: 'base' }],
    });
    expect(duel.friend).toBe('Ami');
    expect(duel.opp.name).toBe('Ami');
    expect(duel.opp.cards).toHaveLength(5);
    expect(duel.opp.cards.slice(0, 2).map((c) => c.athleteId)).toEqual(['lion', 'koala']);
    expect(duel.opp.cards.some((c) => c.athleteId === 'habitat-amazonie')).toBe(false);
  });

  it('rend l’adversaire plus malin dans les hautes divisions', () => {
    expect(aiSkill(10)).toBeLessThan(aiSkill(1));
    expect(aiSkill(1)).toBeLessThanOrEqual(0.95);
  });

  it('compose une équipe auto de cinq espèces différentes, sans carte Habitat', () => {
    const cards = team(['elephant', 'elephant', 'souris', 'tortue-geante', 'loup-d-ethiopie', 'baleine-bleue', 'habitat-amazonie', 'lion']);
    const uids = autoTeamFrom(cards);
    expect(uids).toHaveLength(5);
    const ids = uids.map((uid) => cards.find((c) => c.uid === uid)!.athleteId);
    expect(new Set(ids).size).toBe(5);
    expect(ids).not.toContain('habitat-amazonie');
    expect(ids).toEqual(expect.arrayContaining(['baleine-bleue', 'souris']));
  });
});
