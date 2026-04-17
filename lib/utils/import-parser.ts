// ================================================================
// Universal portfolio import parser
// Supports: CSV, XLSX
// Brokers auto-detected: T-Invest, BCS, universal format
// ================================================================

export interface ParsedRow {
  ticker: string
  quantity: number
  averageBuyPrice: number
  purchaseDate?: string
  brokerAccount?: string
  error?: string
}

export interface ParseResult {
  rows: ParsedRow[]
  broker: 'tinkoff' | 'bcs' | 'universal' | 'unknown'
  totalRows: number
  validRows: number
  errorRows: number
}

// ----------------------------------------------------------------
// CSV Parser
// ----------------------------------------------------------------
export function parseCSV(text: string): ParseResult {
  const lines = text.trim().split(/\r?\n/).filter(l => l.trim())
  if (lines.length < 2) {
    return { rows: [], broker: 'unknown', totalRows: 0, validRows: 0, errorRows: 0 }
  }

  const sep = detectSeparator(lines[0])
  const headers = splitLine(lines[0], sep).map(h =>
    h.trim().toLowerCase().replace(/"/g, '').replace(/\s+/g, ' ')
  )

  const broker = detectBrokerFromHeaders(headers)
  const rows = parseDataRows(lines.slice(1), headers, sep, broker)

  return {
    rows,
    broker,
    totalRows: rows.length,
    validRows: rows.filter(r => !r.error).length,
    errorRows: rows.filter(r => !!r.error).length,
  }
}

// ----------------------------------------------------------------
// XLSX Parser (uses SheetJS loaded via CDN in browser)
// Returns raw 2D array for the client to process
// ----------------------------------------------------------------
export async function parseXLSX(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        // Dynamic import of xlsx at runtime (client-side only)
        import('xlsx').then((XLSX) => {
          const data = new Uint8Array(e.target?.result as ArrayBuffer)
          const workbook = XLSX.read(data, { type: 'array', cellDates: true })

          // Try each sheet — find the one with portfolio data
          let result: ParseResult | null = null

          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            const json: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
              header: 1,
              defval: '',
              blankrows: false,
            })

            if (json.length < 2) continue

            // Find header row (first row with recognizable column names)
            let headerRowIdx = 0
            for (let i = 0; i < Math.min(10, json.length); i++) {
              const rowStr = json[i].join(' ').toLowerCase()
              if (
                rowStr.includes('тикер') ||
                rowStr.includes('ticker') ||
                rowStr.includes('secid') ||
                rowStr.includes('наименование') ||
                rowStr.includes('isin') ||
                rowStr.includes('количество') ||
                rowStr.includes('quantity')
              ) {
                headerRowIdx = i
                break
              }
            }

            const headers = (json[headerRowIdx] as string[]).map(h =>
              String(h).trim().toLowerCase().replace(/\s+/g, ' ')
            )

            const broker = detectBrokerFromHeaders(headers)
            const dataLines = json.slice(headerRowIdx + 1).map(row =>
              (row as string[]).map(cell => String(cell ?? '').trim())
            )

            const rows = parseDataRowsFromArray(dataLines, headers, broker)

            if (rows.length > 0) {
              result = {
                rows,
                broker,
                totalRows: rows.length,
                validRows: rows.filter(r => !r.error).length,
                errorRows: rows.filter(r => !!r.error).length,
              }
              break // Use first sheet with valid data
            }
          }

          resolve(result || { rows: [], broker: 'unknown', totalRows: 0, validRows: 0, errorRows: 0 })
        }).catch(() => {
          resolve({ rows: [], broker: 'unknown', totalRows: 0, validRows: 0, errorRows: 0 })
        })
      } catch {
        resolve({ rows: [], broker: 'unknown', totalRows: 0, validRows: 0, errorRows: 0 })
      }
    }
    reader.readAsArrayBuffer(file)
  })
}

// ----------------------------------------------------------------
// Broker detection
// ----------------------------------------------------------------
type BrokerType = 'tinkoff' | 'bcs' | 'universal' | 'unknown'

function detectBrokerFromHeaders(headers: string[]): BrokerType {
  const joined = headers.join(' ')

  // Т-Инвестиции / Tinkoff
  if (
    joined.includes('figi') ||
    joined.includes('среднее за день') ||
    joined.includes('tinkoff') ||
    joined.includes('т-инвест')
  ) return 'tinkoff'

  // БКС
  if (
    joined.includes('bcs') ||
    joined.includes('бкс') ||
    joined.includes('место хранения') ||
    joined.includes('торговая площадка')
  ) return 'bcs'

  // Our universal format or generic
  if (
    joined.includes('ticker') ||
    joined.includes('тикер') ||
    joined.includes('averagebuyprice') ||
    joined.includes('average_buy_price')
  ) return 'universal'

  return 'unknown'
}

// ----------------------------------------------------------------
// Column mapping per broker
// ----------------------------------------------------------------
interface ColMap {
  ticker: string[]
  quantity: string[]
  price: string[]
  date: string[]
  account: string[]
}

function getColMap(broker: BrokerType): ColMap {
  switch (broker) {
    case 'tinkoff':
      return {
        ticker: ['тикер', 'ticker', 'secid'],
        quantity: ['количество', 'qty', 'quantity', 'лотов'],
        price: ['средняя цена покупки', 'средняя цена', 'цена покупки', 'average price', 'цена'],
        date: ['дата покупки', 'дата', 'date'],
        account: ['счёт', 'счет', 'account', 'тип счета'],
      }
    case 'bcs':
      return {
        ticker: ['код инструмента', 'тикер', 'ticker', 'краткое наименование'],
        quantity: ['количество', 'кол-во', 'qty'],
        price: ['средняя цена', 'цена покупки', 'цена приобретения'],
        date: ['дата сделки', 'дата', 'date'],
        account: ['место хранения', 'счет', 'торговая площадка'],
      }
    default:
      return {
        ticker: ['ticker', 'тикер', 'secid', 'код', 'symbol', 'isin'],
        quantity: ['quantity', 'количество', 'qty', 'кол-во', 'amount', 'лотов'],
        price: ['averagebuyprice', 'average_buy_price', 'цена', 'price', 'цена покупки', 'avg price', 'средняя цена'],
        date: ['purchasedate', 'purchase_date', 'дата', 'date', 'дата покупки'],
        account: ['brokeraccount', 'broker_account', 'счёт', 'счет', 'broker', 'брокер'],
      }
  }
}

// ----------------------------------------------------------------
// Find column index by list of aliases
// ----------------------------------------------------------------
function findColIdx(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const idx = headers.findIndex(h => h === alias || h.includes(alias))
    if (idx !== -1) return idx
  }
  return -1
}

// ----------------------------------------------------------------
// Parse CSV data rows
// ----------------------------------------------------------------
function detectSeparator(line: string): string {
  const counts: Record<string, number> = { ';': 0, ',': 0, '\t': 0 }
  for (const ch of line) {
    if (ch in counts) counts[ch]++
  }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
}

function splitLine(line: string, sep: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === sep && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseDataRows(lines: string[], headers: string[], sep: string, broker: BrokerType): ParsedRow[] {
  const colMap = getColMap(broker)
  const tickerIdx = findColIdx(headers, colMap.ticker)
  const qtyIdx = findColIdx(headers, colMap.quantity)
  const priceIdx = findColIdx(headers, colMap.price)
  const dateIdx = findColIdx(headers, colMap.date)
  const accountIdx = findColIdx(headers, colMap.account)

  if (tickerIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
    return [{
      ticker: '',
      quantity: 0,
      averageBuyPrice: 0,
      error: `Не найдены обязательные колонки. Нужны: тикер, количество, цена. Найдены заголовки: ${headers.slice(0, 8).join(', ')}`,
    }]
  }

  return lines
    .filter(l => l.trim())
    .map(line => {
      const cols = splitLine(line, sep)
      return buildRow(cols, tickerIdx, qtyIdx, priceIdx, dateIdx, accountIdx)
    })
    .filter(r => r.ticker || r.error) // Skip empty rows
}

function parseDataRowsFromArray(rows: string[][], headers: string[], broker: BrokerType): ParsedRow[] {
  const colMap = getColMap(broker)
  const tickerIdx = findColIdx(headers, colMap.ticker)
  const qtyIdx = findColIdx(headers, colMap.quantity)
  const priceIdx = findColIdx(headers, colMap.price)
  const dateIdx = findColIdx(headers, colMap.date)
  const accountIdx = findColIdx(headers, colMap.account)

  if (tickerIdx === -1 || qtyIdx === -1 || priceIdx === -1) {
    return []
  }

  return rows
    .filter(cols => cols.some(c => c.trim()))
    .map(cols => buildRow(cols, tickerIdx, qtyIdx, priceIdx, dateIdx, accountIdx))
    .filter(r => r.ticker || r.error)
}

function buildRow(
  cols: string[],
  tickerIdx: number,
  qtyIdx: number,
  priceIdx: number,
  dateIdx: number,
  accountIdx: number
): ParsedRow {
  const rawTicker = (cols[tickerIdx] || '').replace(/"/g, '').trim().toUpperCase()
  const rawQty = (cols[qtyIdx] || '').replace(/"/g, '').trim().replace(/\s/g, '').replace(',', '.')
  const rawPrice = (cols[priceIdx] || '').replace(/"/g, '').trim().replace(/\s/g, '').replace(',', '.')
  const rawDate = dateIdx >= 0 ? (cols[dateIdx] || '').replace(/"/g, '').trim() : ''
  const rawAccount = accountIdx >= 0 ? (cols[accountIdx] || '').replace(/"/g, '').trim() : ''

  const qty = parseFloat(rawQty)
  const price = parseFloat(rawPrice)

  // Normalize date to YYYY-MM-DD
  let purchaseDate: string | undefined
  if (rawDate) {
    const d = parseDate(rawDate)
    if (d) purchaseDate = d
  }

  const row: ParsedRow = {
    ticker: rawTicker,
    quantity: qty,
    averageBuyPrice: price,
    purchaseDate: purchaseDate || undefined,
    brokerAccount: rawAccount || undefined,
  }

  if (!rawTicker) row.error = 'Пустой тикер'
  else if (isNaN(qty) || qty <= 0) row.error = `Некорректное количество: "${rawQty}"`
  else if (isNaN(price) || price <= 0) row.error = `Некорректная цена: "${rawPrice}"`

  return row
}

function parseDate(raw: string): string | null {
  // Try ISO
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  // Try DD.MM.YYYY
  const m = raw.match(/^(\d{2})\.(\d{2})\.(\d{4})/)
  if (m) return `${m[3]}-${m[2]}-${m[1]}`
  // Try DD/MM/YYYY
  const m2 = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (m2) return `${m2[3]}-${m2[2]}-${m2[1]}`
  return null
}
