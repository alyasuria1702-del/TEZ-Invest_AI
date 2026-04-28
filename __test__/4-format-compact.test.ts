// ═══════════════════════════════════════════════════════════════════════
// Тест 4: formatCompactNumber — сокращение больших чисел
// Функция: lib/utils/format.ts → formatCompactNumber()
// Фреймворк: Vitest
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { formatCompactNumber } from '@/lib/utils/format'

describe('formatCompactNumber', () => {
  // ── Нормальный ввод ──
  it('форматирует тысячи как K', () => {
    expect(formatCompactNumber(1500)).toBe('1.5K')
  })

  it('форматирует миллионы как M', () => {
    expect(formatCompactNumber(2_500_000)).toBe('2.5M')
  })

  it('форматирует миллиарды как B', () => {
    expect(formatCompactNumber(1_200_000_000)).toBe('1.2B')
  })

  // ── Граничные значения ──
  it('ноль → строка "0"', () => {
    expect(formatCompactNumber(0)).toBe('0')
  })

  it('999 остаётся без суффикса', () => {
    expect(formatCompactNumber(999)).toBe('999')
  })

  it('ровно 1000 → "1.0K"', () => {
    expect(formatCompactNumber(1000)).toBe('1.0K')
  })

  // ── Edge case ──
  it('999999 → "1000.0K" (граница M)', () => {
    expect(formatCompactNumber(999_999)).toBe('1000.0K')
  })
})
