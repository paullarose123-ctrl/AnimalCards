import { describe, expect, it } from 'vitest';
import { ATHLETES, ATHLETES_BY_ID } from '../../data/athletes';
import { RECORD_START, baseValueOf, canBePrime, overallOf, rarityOf, primeRecordStart } from '../cards';
import { FREE_ODDS, FREE_PACK, NO_DUPE_WINDOW, SHOP_PACKS, openPack, primeOdds, sportPack } from '../packs';
import { advanceMarket, createAiListing, createMarket, createMyListing, marketPrice, netAfterTax, TARGET_LISTINGS, type MarketState } from '../market';
import { computePower, createMatch, matchResult, mytheBonus, playRound, ROUNDS, takenMalus, type MatchCard } from '../match';
import { mulberry32 } from '../random';

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

  it('respecte la carte garantie des packs payants', () => {
    const rng = mulberry32(7);
    const elite = SHOP_PACKS.find((p) => p.id === 'elite')!;
    const legende = SHOP_PACKS.find((p) => p.id === 'legende')!;
    const prime = SHOP_PACKS.find((p) => p.id === 'prime')!;
    for (let i = 0; i < 100; i++) {
      const best = openPack(elite, rng).at(-1)!;
      expect(rarityOf(ATHLETES_BY_ID[best.athleteId]).order).toBeGreaterThanOrEqual(3);
      const legend = openPack(legende, rng).at(-1)!;
      expect(rarityOf(ATHLETES_BY_ID[legend.athleteId]).id).toBe('legendaire');
      expect(openPack(prime, rng).some((c) => c.variant === 'prime')).toBe(true);
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
    expect(overallOf(zebre, 'reverse')).toBe(overallOf(zebre));
  });

  it('sort une carte Mythe environ une fois sur 40, sans toucher à la carte garantie', () => {
    const rng = mulberry32(99);
    let mythes = 0;
    let total = 0;
    for (let i = 0; i < 4000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (ATHLETES_BY_ID[card.athleteId].mythe) mythes += 1;
      }
    }
    expect(mythes / total).toBeGreaterThan(0.018);
    expect(mythes / total).toBeLessThan(0.032);
    // la carte garantie reste un animal Légendaire ; un Mythe tiré en plus peut être classé après elle
    const legende = SHOP_PACKS.find((p) => p.id === 'legende')!;
    for (let i = 0; i < 300; i++) {
      const athletes = openPack(legende, rng).map((card) => ATHLETES_BY_ID[card.athleteId]);
      expect(athletes.some((athlete) => !athlete.mythe && rarityOf(athlete).id === 'legendaire')).toBe(true);
    }
  });

  it('rend les Icônes très rares hors de leurs packs (environ 1 carte sur 200)', () => {
    const rng = mulberry32(7);
    const isIconCard = (card: { athleteId: string }) => {
      const athlete = ATHLETES_BY_ID[card.athleteId];
      return !!athlete.retired && !athlete.mythe;
    };
    let icons = 0;
    let total = 0;
    for (let i = 0; i < 8000; i++) {
      for (const card of openPack(FREE_PACK, rng)) {
        total += 1;
        if (isIconCard(card)) icons += 1;
      }
    }
    expect(icons / total).toBeGreaterThan(0.003);
    expect(icons / total).toBeLessThan(0.008);
    // le Pack Icônes et le Pack Préhistoire, eux, ne contiennent que des Icônes (ou un Mythe)
    const iconPack = SHOP_PACKS.find((p) => p.id === 'icones')!;
    const prehistoire = sportPack('prehistoire', 'Préhistoire');
    for (let i = 0; i < 300; i++) {
      for (const pack of [iconPack, prehistoire]) {
        for (const card of openPack(pack, rng)) expect(isIconCard(card) || !!ATHLETES_BY_ID[card.athleteId].mythe).toBe(true);
      }
    }
  });

  it('ne donne le bonus d’une carte Mythe qu’aux animaux de sa famille', () => {
    const side = { mythe: { uid: 'm', athleteId: 'mythe-lion-aile', variant: 'base' as const } };
    expect(mytheBonus(side, { athleteId: 'lion', variant: 'base' }, 'sprint')?.value).toBe(4);
    expect(mytheBonus(side, { athleteId: 'lion', variant: 'base' }, 'coup-de-genie')?.value).toBe(8);
    expect(mytheBonus(side, { athleteId: 'loup', variant: 'base' }, 'sprint')).toBeNull();
    const tortue = { mythe: { uid: 'j', athleteId: 'mythe-tortue-monde', variant: 'base' as const } };
    expect(mytheBonus(tortue, { athleteId: 'loup', variant: 'base' }, 'sprint')?.value).toBe(2);
  });

  it('ne donne une version Prime qu’aux espèces vedettes', () => {
    const rng = mulberry32(99);
    const legends = ATHLETES.filter(canBePrime).map((a) => a.id);
    expect(legends).toEqual(expect.arrayContaining(['lion', 't-rex', 'loup', 'chien', 'guepard']));
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

  it('inscrit le record de vitesse du guépard sur sa carte', () => {
    expect(primeRecordStart(ATHLETES_BY_ID.guepard)).toBe(RECORD_START);
    expect(primeRecordStart(ATHLETES_BY_ID.lion)).toBeUndefined();
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

describe('matchs', () => {
  const team = (ids: string[]): MatchCard[] => ids.map((id, i) => ({ uid: `u${i}`, athleteId: id, variant: 'base' }));

  it('se joue en 5 manches et désigne un résultat', () => {
    const rng = mulberry32(3);
    let match = createMatch(team(['herisson', 'zebre', 'gnou', 'castor', 'lapin']), 10, rng);
    for (let round = 0; round < ROUNDS; round++) {
      expect(match.finished).toBe(false);
      match = playRound(match, round, false, rng).state;
    }
    expect(match.finished).toBe(true);
    expect(match.log).toHaveLength(ROUNDS);
    expect(['win', 'draw', 'loss']).toContain(matchResult(match));
  });

  it('consomme de l’énergie pour un ulti et interdit de rejouer un animal', () => {
    const rng = mulberry32(8);
    const match = createMatch(team(['lion', 'tigre', 'elephant', 'orque', 'requin-blanc']), 5, rng);
    const { state } = playRound(match, 0, true, rng);
    expect(state.me.energy).toBeLessThanOrEqual(match.me.energy);
    expect(() => playRound(state, 0, false, rng)).toThrow();
  });

  it('fait grimper le record du guépard d’un km/h à chaque ulti', () => {
    const rng = mulberry32(11);
    const cards = team(['guepard', 'zebre', 'gnou', 'castor', 'herisson']);
    cards[0].record = RECORD_START;
    const created = createMatch(cards, 8, rng);
    // l'adversaire, tiré au hasard, n'a pas d'énergie : aucun contre ne peut annuler l'ulti du guépard
    const match = { ...created, opp: { ...created.opp, energy: 0 } };
    const { state, log } = playRound(match, 0, true, rng);
    expect(log.records).toEqual(['u0']);
    expect(state.me.cards[0].record).toBe(RECORD_START + 1);
  });

  it('donne à chaque famille sa particularité : Intelligence, Insaisissable et Dernier rugissement', () => {
    const rng = mulberry32(21);
    // primates : un point d'énergie de plus au coup d'envoi, une seule fois par équipe
    expect(createMatch(team(['gorille', 'chimpanze', 'lion', 'tigre', 'elephant']), 8, rng).me.energy).toBe(3);
    expect(createMatch(team(['lion', 'tigre', 'elephant', 'orque', 'requin-blanc']), 8, rng).me.energy).toBe(2);
    // invertébrés : ils ne subissent rien et renvoient ce qu'on leur envoie
    expect(takenMalus('invertebres', 'canides', 10, 0)).toEqual({ direct: 0, returned: 0 });
    expect(takenMalus('canides', 'invertebres', 4, 10)).toEqual({ direct: 4, returned: 10 });
    expect(takenMalus('invertebres', 'invertebres', 8, 8)).toEqual({ direct: 0, returned: 0 });
    expect(takenMalus('marins', 'invertebres', 3, 9)).toEqual({ direct: 0, returned: 0 });
    expect(takenMalus('canides', 'marsupiaux', 6, 9)).toEqual({ direct: 6, returned: 0 });
    // préhistoire : +8 à la dernière manche seulement
    const match = createMatch(team(['t-rex', 'velociraptor', 'lion', 'tigre', 'elephant']), 8, rng);
    const clutch = (round: number) => computePower(match.me, match.opp, 0, 'sprint', round, false, false).parts.find((part) => part.label === 'Dernier rugissement');
    expect(clutch(ROUNDS - 1)?.value).toBe(8);
    expect(clutch(0)).toBeUndefined();
  });

  it('donne l’avantage à une équipe de légendes contre une division faible', () => {
    let wins = 0;
    for (let seed = 0; seed < 40; seed++) {
      const rng = mulberry32(seed);
      let match = createMatch(team(['lion', 'tigre', 'elephant', 'orque', 'requin-blanc']), 10, rng);
      for (let round = 0; round < ROUNDS; round++) match = playRound(match, round, round >= 3, rng).state;
      if (matchResult(match) === 'win') wins += 1;
    }
    expect(wins).toBeGreaterThan(32);
  });
});
