import { create } from 'zustand';
import type { CardFace, OwnedCard, RarityId, SportId } from '../engine/types';

export type Tab = 'boosters' | 'collection' | 'mercato' | 'matchs' | 'boutique';

export interface DetailTarget {
  card: CardFace | OwnedCard;
  /** annonce du marché d'où vient la carte */
  listingId?: string;
}

export interface MarketFilters {
  query: string;
  sport: SportId | '';
  rarity: RarityId | '';
  prime: boolean;
  icons: boolean;
  maxPrice: number | null;
  sort: 'ending' | 'price-asc' | 'price-desc' | 'rating';
}

interface UiState {
  tab: Tab;
  detail: DetailTarget | null;
  marketFilters: MarketFilters;
  marketTab: 'buy' | 'mine' | 'watch';
  setTab: (tab: Tab) => void;
  openDetail: (target: DetailTarget) => void;
  closeDetail: () => void;
  setMarketFilters: (patch: Partial<MarketFilters>) => void;
  setMarketTab: (tab: UiState['marketTab']) => void;
  searchMarketFor: (athleteName: string) => void;
}

const TABS: Tab[] = ['boosters', 'collection', 'mercato', 'matchs', 'boutique'];

function tabFromHash(): Tab {
  try {
    const hash = window.location.hash.replace('#', '') as Tab;
    return TABS.includes(hash) ? hash : 'boosters';
  } catch {
    return 'boosters';
  }
}

export const DEFAULT_FILTERS: MarketFilters = { query: '', sport: '', rarity: '', prime: false, icons: false, maxPrice: null, sort: 'ending' };

export const useUi = create<UiState>()((set) => ({
  tab: tabFromHash(),
  detail: null,
  marketFilters: DEFAULT_FILTERS,
  marketTab: 'buy',
  setTab: (tab) => {
    try {
      window.history.replaceState(null, '', `#${tab}`);
    } catch {
      /* rien */
    }
    set({ tab });
    window.scrollTo({ top: 0 });
  },
  openDetail: (detail) => set({ detail }),
  closeDetail: () => set({ detail: null }),
  setMarketFilters: (patch) => set((s) => ({ marketFilters: { ...s.marketFilters, ...patch } })),
  setMarketTab: (marketTab) => set({ marketTab }),
  searchMarketFor: (athleteName) =>
    set({ tab: 'mercato', marketTab: 'buy', detail: null, marketFilters: { ...DEFAULT_FILTERS, query: athleteName } }),
}));
