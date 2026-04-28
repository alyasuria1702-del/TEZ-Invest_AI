// ═══════════════════════════════════════════════════════════════════════
// Тест 1: calculatePositionMetrics — расчёт метрик позиции
// Функция: lib/utils/portfolio.ts → calculatePositionMetrics()
// Фреймворк: Vitest
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { calculatePositionMetrics } from '@/lib/utils/portfolio'
import type { PositionWithInstrument } from '@/lib/types/database'

/** Хелпер: быстрый мок позиции с нужными параметрами */
function makePos(opts: {
  qty?: number
  buyPrice?: number
  lastPrice?: number | null
  type?: 'bond' | 'stock' | 'etf'
  couponValue?: number | null
}): PositionWithInstrument {
  return {
    id: 'p1', portfolio_id: 'pf1', instrument_id: 'i1',
    quantity: opts.qty ?? 10,
    average_buy_price: opts.buyPrice ?? 100,
    purchase_date: '2024-01-01', broker_account: null,
    created_at: '', updated_at: '',
    instrument: {
      id: 'i1', ticker: 'SBER', isin: null,
      name: 'Сбербанк', short_name: 'Сбер',
      instrument_type: opts.type ?? 'stock',
      currency: 'RUB', board_id: 'TQBR',
      coupon_rate: null,
      coupon_value: opts.couponValue ?? null,
      maturity_date: null, face_value: null, lot_size: 1,
      last_price: opts.lastPrice !== undefined ? opts.lastPrice : 150,
      price_change_percent: null, price_updated_at: null,
      created_at: '', updated_at: '',
    },
  }
}

describe('calculatePositionMetrics', () => {
  // ── Нормальный ввод ──
  it('рассчитывает прибыль при росте цены', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 100, lastPrice: 150 }), 1500)
    expect(m.profitLoss).toBe(500)
  })

  it('рассчитывает убыток при падении цены', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 100, lastPrice: 80 }), 800)
    expect(m.profitLoss).toBe(-200)
  })

  it('рассчитывает процент доходности', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 100, lastPrice: 120 }), 1200)
    expect(m.profitLossPercent).toBe(20)
  })

  // ── Граничные значения ──
  it('использует цену покупки когда last_price = null', () => {
    const m = calculatePositionMetrics(makePos({ qty: 5, buyPrice: 200, lastPrice: null }), 1000)
    expect(m.currentValue).toBe(1000)
  })

  it('вес = 0 когда стоимость портфеля = 0 (деление на ноль)', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 100, lastPrice: 100 }), 0)
    expect(m.weight).toBe(0)
  })

  it('P&L% = 0 когда цена покупки = 0 (деление на ноль)', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 0, lastPrice: 100 }), 1000)
    expect(m.profitLossPercent).toBe(0)
  })

  // ── Edge cases ──
  it('одна штука — минимальная позиция', () => {
    const m = calculatePositionMetrics(makePos({ qty: 1, buyPrice: 500, lastPrice: 600 }), 600)
    expect(m.profitLoss).toBe(100)
  })

  it('очень большое количество', () => {
    const m = calculatePositionMetrics(makePos({ qty: 1_000_000, buyPrice: 1000, lastPrice: 1001 }), 1_001_000_000)
    expect(m.profitLoss).toBe(1_000_000)
  })

  it('рассчитывает вес позиции в портфеле', () => {
    const m = calculatePositionMetrics(makePos({ qty: 10, buyPrice: 100, lastPrice: 100 }), 2000)
    expect(m.weight).toBe(50)
  })
})
