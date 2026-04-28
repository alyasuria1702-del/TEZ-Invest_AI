// ═══════════════════════════════════════════════════════════════════════
// Тест 3: calculateExpectedPayments — прогноз купонного дохода
// Функция: lib/utils/portfolio.ts → calculateExpectedPayments()
// Фреймворк: Vitest
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { calculateExpectedPayments } from '@/lib/utils/portfolio'
import type { PositionWithInstrument } from '@/lib/types/database'

function makePos(type: 'stock' | 'bond', qty: number, couponValue: number | null): PositionWithInstrument {
  return {
    id: 'p1', portfolio_id: 'pf1', instrument_id: 'i1',
    quantity: qty, average_buy_price: 1000,
    purchase_date: null, broker_account: null, created_at: '', updated_at: '',
    instrument: {
      id: 'i1', ticker: 'TEST', isin: null, name: 'Test', short_name: 'T',
      instrument_type: type, currency: 'RUB', board_id: 'TQCB',
      coupon_rate: null, coupon_value: couponValue, maturity_date: null,
      face_value: null, lot_size: 1,
      last_price: null, price_change_percent: null, price_updated_at: null,
      created_at: '', updated_at: '',
    },
  }
}

describe('calculateExpectedPayments', () => {
  // ── Нормальный ввод ──
  it('рассчитывает годовой купонный доход облигации', () => {
    const result = calculateExpectedPayments([makePos('bond', 10, 50)], 365)
    expect(result.coupon).toBe(1000) // 50 * 2 * 10
  })

  // ── Граничные значения ──
  it('возвращает 0 купонов для акций', () => {
    const result = calculateExpectedPayments([makePos('stock', 10, null)])
    expect(result.coupon).toBe(0)
  })

  it('пропорциональный расчёт за 30 дней', () => {
    const result = calculateExpectedPayments([makePos('bond', 1, 365)], 30)
    expect(result.coupon).toBeCloseTo(60, 0) // 365*2 * 30/365 = 60
  })

  // ── Edge case ──
  it('возвращает нули для пустого массива позиций', () => {
    const result = calculateExpectedPayments([])
    expect(result.coupon).toBe(0)
  })
})
