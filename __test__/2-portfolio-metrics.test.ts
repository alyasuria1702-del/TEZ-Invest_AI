// ═══════════════════════════════════════════════════════════════════════
// Тест 2: calculatePortfolioMetrics — агрегация по всему портфелю
// Функция: lib/utils/portfolio.ts → calculatePortfolioMetrics()
// Фреймворк: Vitest
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { calculatePortfolioMetrics } from '@/lib/utils/portfolio'
import type { PositionWithInstrument } from '@/lib/types/database'

function makePos(ticker: string, qty: number, buyPrice: number, lastPrice: number | null, type: 'stock' | 'bond' | 'etf' = 'stock'): PositionWithInstrument {
  return {
    id: `p-${ticker}`, portfolio_id: 'pf1', instrument_id: `i-${ticker}`,
    quantity: qty, average_buy_price: buyPrice,
    purchase_date: null, broker_account: null, created_at: '', updated_at: '',
    instrument: {
      id: `i-${ticker}`, ticker, isin: null, name: ticker, short_name: ticker,
      instrument_type: type, currency: 'RUB', board_id: 'TQBR',
      coupon_rate: null, coupon_value: null, maturity_date: null,
      face_value: null, lot_size: 1,
      last_price: lastPrice, price_change_percent: null, price_updated_at: null,
      created_at: '', updated_at: '',
    },
  }
}

describe('calculatePortfolioMetrics', () => {
  // ── Нормальный ввод ──
  it('корректно суммирует стоимость двух позиций', () => {
    const result = calculatePortfolioMetrics([
      makePos('SBER', 10, 100, 150),
      makePos('GAZP', 5, 200, 200),
    ])
    expect(result.totalValue).toBe(2500) // 10*150 + 5*200
  })

  it('рассчитывает общий P&L', () => {
    const result = calculatePortfolioMetrics([
      makePos('SBER', 10, 100, 120),
    ])
    expect(result.totalProfitLoss).toBe(200) // (120-100)*10
  })

  // ── Граничные значения ──
  it('возвращает нули для пустого портфеля', () => {
    const result = calculatePortfolioMetrics([])
    expect(result.totalValue).toBe(0)
  })

  it('общий P&L% = 0 при нулевой стоимости покупки', () => {
    const result = calculatePortfolioMetrics([makePos('X', 10, 0, 100)])
    expect(result.totalProfitLossPercent).toBe(0)
  })

  // ── Edge cases ──
  it('одна позиция — вес = 100%', () => {
    const result = calculatePortfolioMetrics([makePos('SBER', 10, 100, 100)])
    expect(result.positions[0].weight).toBe(100)
  })

  it('группирует распределение по типам активов', () => {
    const result = calculatePortfolioMetrics([
      makePos('SBER', 10, 100, 100, 'stock'),
      makePos('SU26', 10, 100, 100, 'bond'),
    ])
    expect(result.assetAllocation.length).toBe(2)
  })
})
