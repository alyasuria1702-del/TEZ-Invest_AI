// Tez Invest AI - Database Types

export type InstrumentType = 'bond' | 'stock' | 'etf'
export type PaymentType = 'coupon' | 'dividend'
export type PaymentStatus = 'expected' | 'accrued' | 'paid'
export type ThemePreference = 'light' | 'dark' | 'system'

export interface Profile {
  id: string
  email: string | null
  theme: ThemePreference
  created_at: string
}

export interface Portfolio {
  id: string
  user_id: string
  name: string
  is_default: boolean
  created_at: string
  updated_at: string
}

export interface Instrument {
  id: string
  ticker: string
  isin: string | null
  name: string
  short_name: string | null
  instrument_type: InstrumentType
  currency: string
  board_id: string | null
  coupon_rate: number | null
  coupon_value: number | null
  maturity_date: string | null
  face_value: number | null
  lot_size: number
  last_price: number | null
  price_change_percent: number | null
  price_updated_at: string | null
  created_at: string
  updated_at: string
}

export interface Position {
  id: string
  portfolio_id: string
  instrument_id: string
  quantity: number
  average_buy_price: number
  purchase_date: string | null
  broker_account: string | null
  created_at: string
  updated_at: string
}

export interface PositionWithInstrument extends Position {
  instrument: Instrument
}

export interface Payment {
  id: string
  position_id: string
  instrument_id: string
  payment_type: PaymentType
  record_date: string | null
  payment_date: string | null
  amount_per_unit: number | null
  total_amount: number | null
  currency: string
  status: PaymentStatus
  created_at: string
}

export interface AiSummary {
  id: string
  instrument_id: string
  user_id: string
  summary: string
  generated_at: string
}

export interface PriceHistory {
  id: string
  instrument_id: string
  trade_date: string
  close_price: number
  volume: number | null
}

export interface PositionMetrics {
  position: PositionWithInstrument
  currentValue: number
  purchaseValue: number
  profitLoss: number
  profitLossPercent: number
  weight: number
}

export interface PortfolioMetrics {
  totalValue: number
  totalPurchaseValue: number
  totalProfitLoss: number
  totalProfitLossPercent: number
  positions: PositionMetrics[]
  assetAllocation: {
    type: InstrumentType
    value: number
    percent: number
  }[]
}

export interface MoexSecurityInfo {
  SECID: string
  ISIN: string
  SHORTNAME: string
  NAME: string
  SECTYPE: string
  BOARDID: string
  FACEVALUE?: number
  COUPONVALUE?: number
  COUPONPERCENT?: number
  MATDATE?: string
  LOTSIZE?: number
}

export interface MoexMarketData {
  SECID: string
  LAST: number
  LASTTOPREVPRICE?: number
  OPEN?: number
  HIGH?: number
  LOW?: number
  VALTODAY?: number
  VOLTODAY?: number
}

export interface MoexCoupon {
  coupondate: string
  recorddate: string
  value_rub: number
}
