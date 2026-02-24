// ─── Card Database ────────────────────────────────────────────────────────────

export type Rarity = 'Ordinary' | 'Exceptional' | 'Elite' | 'Unique'
export type Finish = 'Standard' | 'Foil' | 'Rainbow'
export type Condition = 'NM' | 'LP' | 'MP' | 'HP' | 'DMG'
export type ListingType = 'selling' | 'buying' | 'trading'

export interface CardVariant {
  slug: string
  finish: Finish
}

export interface CardSet {
  /** Full set name e.g. "Arthurian Legends" */
  n: string
  v: CardVariant[]
}

/** Shape of each entry in the embedded card database (minified keys) */
export interface RawCardRecord {
  n: string   // name
  r: Rarity   // rarity
  t: string   // type (Minion, Spell, Site…)
  s: CardSet[] // sets
}

/** Normalised card record used throughout the app */
export interface CardRecord {
  name: string
  rarity: Rarity
  type: string
  sets: CardSet[]
}

// ─── Parser / Review ──────────────────────────────────────────────────────────

export interface ParsedLine {
  rawName: string
  qty: number
  condition: Condition
  finish: Finish
  setName: string
}

export interface CardRow {
  id: string
  rawLine: string
  rawName: string
  qty: number
  condition: Condition
  finish: Finish
  setName: string
  matched: boolean
  matchedCard: CardRecord | null
  suggestions: string[]
  price: string
}

// ─── Listing / Seller Info ────────────────────────────────────────────────────

export interface SellerInfo {
  discord: string
  currency: string
  openToOffers: boolean
  paymentMethods: string[]
  shipsFrom: string
  shipsTo: string
  tradeOffer: string
  comments: string
}

// ─── App State ────────────────────────────────────────────────────────────────

export type Step = 1 | 2 | 3 | 4

export interface AppState {
  step: Step
  listingType: ListingType
  cards: CardRow[]
  sellerInfo: SellerInfo
  outputTab: 'raw' | 'preview'

  // Actions
  setStep: (step: Step) => void
  setListingType: (type: ListingType) => void
  setCards: (cards: CardRow[]) => void
  updateCard: (id: string, patch: Partial<CardRow>) => void
  removeCard: (id: string) => void
  setSellerInfo: (patch: Partial<SellerInfo>) => void
  setOutputTab: (tab: 'raw' | 'preview') => void
}
