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
  n: string   // set name
  v: CardVariant[]
}

export interface RawCardRecord {
  n: string
  r: Rarity
  t: string
  s: CardSet[]
}

export interface CardRecord {
  name: string
  rarity: Rarity
  type: string
  sets: CardSet[]
}

// ─── Prices ───────────────────────────────────────────────────────────────────

export interface CardPrice {
  market: number
  low: number
}

export interface PriceData {
  updated: string       // ISO timestamp
  source: string        // e.g. "CardNexus"
  sourceUrl: string     // link to price source homepage
  prices: Record<string, CardPrice>  // keyed by variant slug
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
  price: string         // manual override — empty string means "use market price"
  slug: string | null   // resolved variant slug for price lookup
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
  priceData: PriceData | null

  // Actions
  setStep: (step: Step) => void
  setListingType: (type: ListingType) => void
  setCards: (cards: CardRow[]) => void
  updateCard: (id: string, patch: Partial<CardRow>) => void
  removeCard: (id: string) => void
  setSellerInfo: (patch: Partial<SellerInfo>) => void
  setOutputTab: (tab: 'raw' | 'preview') => void
  setPriceData: (data: PriceData | null) => void
}
