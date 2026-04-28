// ═══════════════════════════════════════════════════════════════════════
// Тест 5: parseCSV — парсер брокерских отчётов
// Функция: lib/utils/import-parser.ts → parseCSV()
// Фреймворк: Vitest
// ═══════════════════════════════════════════════════════════════════════

import { describe, it, expect } from 'vitest'
import { parseCSV } from '@/lib/utils/import-parser'

describe('parseCSV', () => {
  // ── Нормальный ввод ──
  it('парсит универсальный CSV с запятой', () => {
    const csv = 'ticker,quantity,averagebuyprice\nSBER,10,250.5\nGAZP,5,180'
    const result = parseCSV(csv)
    expect(result.validRows).toBe(2)
  })

  it('определяет брокера Тинькофф по заголовку figi', () => {
    const csv = 'тикер,figi,количество,средняя цена покупки\nSBER,BBG004730N88,10,250'
    const result = parseCSV(csv)
    expect(result.broker).toBe('tinkoff')
  })

  it('определяет брокера БКС по заголовку торговая площадка', () => {
    const csv = 'код инструмента;количество;цена приобретения;торговая площадка\nSBER;10;250;MOEX'
    const result = parseCSV(csv)
    expect(result.broker).toBe('bcs')
  })

  // ── Граничные значения ──
  it('возвращает пустой результат для пустой строки', () => {
    const result = parseCSV('')
    expect(result.totalRows).toBe(0)
  })

  it('возвращает 0 строк для CSV из одного заголовка', () => {
    const result = parseCSV('ticker,quantity,price')
    expect(result.totalRows).toBe(0)
  })

  // ── Edge cases ──
  it('парсит CSV с точкой-запятой (русская локаль)', () => {
    const csv = 'тикер;количество;цена покупки\nSBER;10;250\nGAZP;5;180'
    const result = parseCSV(csv)
    expect(result.validRows).toBe(2)
  })

  it('обрабатывает переводы строк Windows (\\r\\n)', () => {
    const csv = 'ticker,quantity,averagebuyprice\r\nSBER,10,250\r\nGAZP,5,180'
    const result = parseCSV(csv)
    expect(result.validRows).toBe(2)
  })
})
