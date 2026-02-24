import { create } from 'zustand'
import type { AppState, CardRow, ListingType, SellerInfo, Step } from '@/types'

const DEFAULT_SELLER: SellerInfo = {
  discord: '',
  currency: 'USD',
  openToOffers: false,
  paymentMethods: [],
  shipsFrom: '',
  shipsTo: '',
  tradeOffer: '',
  comments: '',
}

export const useStore = create<AppState>((set) => ({
  step: 1,
  listingType: 'selling',
  cards: [],
  sellerInfo: DEFAULT_SELLER,
  outputTab: 'raw',

  setStep: (step: Step) => set({ step }),

  setListingType: (listingType: ListingType) => set({ listingType }),

  setCards: (cards: CardRow[]) => set({ cards }),

  updateCard: (id: string, patch: Partial<CardRow>) =>
    set(state => ({
      cards: state.cards.map(c => (c.id === id ? { ...c, ...patch } : c)),
    })),

  removeCard: (id: string) =>
    set(state => ({
      cards: state.cards.filter(c => c.id !== id),
    })),

  setSellerInfo: (patch: Partial<SellerInfo>) =>
    set(state => ({
      sellerInfo: { ...state.sellerInfo, ...patch },
    })),

  setOutputTab: (outputTab) => set({ outputTab }),
}))
