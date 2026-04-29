// MOEX ISS API Service
// Documentation: https://iss.moex.com/iss/reference/

const MOEX_BASE_URL = 'https://iss.moex.com/iss'

interface MoexResponse<T> {
  data: T[]
  columns: string[]
}

function parseResponse<T>(data: { columns: string[]; data: unknown[][] }): T[] {
  const { columns, data: rows } = data
  return rows.map((row) => {
    const obj: Record<string, unknown> = {}
    columns.forEach((col, index) => {
      obj[col] = row[index]
    })
    return obj as T
  })
}

// Search securities by query
export async function searchSecurities(query: string): Promise<{
  ticker: string
  name: string
  shortName: string
  type: string
  isin: string
  boardId: string
}[]> {
  const url = `${MOEX_BASE_URL}/securities.json?q=${encodeURIComponent(query)}&limit=20`
  
  const response = await fetch(url, { next: { revalidate: 60 } })
  if (!response.ok) throw new Error('Failed to search securities')
  
  const json = await response.json()
  const securities = json.securities
  
  if (!securities?.data?.length) return []
  
  return parseResponse<{
    secid: string
    name: string
    shortname: string
    type: string
    isin: string
    primary_boardid: string
  }>(securities).map(s => ({
    ticker: s.secid,
    name: s.name,
    shortName: s.shortname,
    type: s.type,
    isin: s.isin,
    boardId: s.primary_boardid
  }))
}

// Get security details
export async function getSecurityInfo(ticker: string): Promise<{
  ticker: string
  isin: string
  name: string
  shortName: string
  type: string
  boardId: string
  faceValue: number | null
  couponValue: number | null
  couponPercent: number | null
  maturityDate: string | null
  lotSize: number
} | null> {
  const url = `${MOEX_BASE_URL}/securities/${ticker}.json`
  
  const response = await fetch(url, { next: { revalidate: 300 } })
  if (!response.ok) return null
  
  const json = await response.json()
  const description = json.description
  
  if (!description?.data?.length) return null
  
  // Parse description data (key-value pairs)
  const descMap: Record<string, string> = {}
  description.data.forEach((row: string[]) => {
    descMap[row[0]] = row[2]
  })

  // Get board info
  const boards = json.boards
  const boardData = boards?.data?.[0]
  const boardId = boardData?.[boards.columns.indexOf('boardid')] || 'TQBR'

  return {
    ticker: descMap.SECID || ticker,
    isin: descMap.ISIN || '',
    name: descMap.NAME || '',
    shortName: descMap.SHORTNAME || '',
    type: descMap.TYPE || '',
    boardId,
    faceValue: descMap.FACEVALUE ? parseFloat(descMap.FACEVALUE) : null,
    couponValue: descMap.COUPONVALUE ? parseFloat(descMap.COUPONVALUE) : null,
    couponPercent: descMap.COUPONPERCENT ? parseFloat(descMap.COUPONPERCENT) : null,
    maturityDate: descMap.MATDATE || null,
    lotSize: descMap.LOTSIZE ? parseInt(descMap.LOTSIZE) : 1
  }
}

// Get current market data for a security
export async function getMarketData(ticker: string, boardId: string = 'TQBR'): Promise<{
  price: number
  priceChange: number
  open: number | null
  high: number | null
  low: number | null
  volume: number | null
  value: number | null
} | null> {
  // Determine engine and market based on boardId
  let engine = 'stock'
  let market = 'shares'
  
  if (['TQOB', 'TQCB', 'TQOD'].includes(boardId)) {
    market = 'bonds'
  } else if (['TQTF', 'TQIF'].includes(boardId)) {
    market = 'shares' // ETFs are on shares market
  }
  
  const url = `${MOEX_BASE_URL}/engines/${engine}/markets/${market}/boards/${boardId}/securities/${ticker}.json`
  
  const response = await fetch(url, { next: { revalidate: 30 } })
  if (!response.ok) return null
  
  const json = await response.json()
  const marketdata = json.marketdata
  
  if (!marketdata?.data?.length) return null
  
  const data = parseResponse<{
    LAST: number
    LASTTOPREVPRICE: number
    OPEN: number
    HIGH: number
    LOW: number
    VOLTODAY: number
    VALTODAY: number
  }>(marketdata)[0]
  
  if (!data) return null
  
  return {
    price: data.LAST || 0,
    priceChange: data.LASTTOPREVPRICE || 0,
    open: data.OPEN || null,
    high: data.HIGH || null,
    low: data.LOW || null,
    volume: data.VOLTODAY || null,
    value: data.VALTODAY || null
  }
}

// Get historical prices
export async function getHistoricalPrices(
  ticker: string,
  boardId: string = 'TQBR',
  from?: string,
  till?: string
): Promise<{
  date: string
  close: number
  volume: number
}[]> {
  const isBond = ['TQOB', 'TQCB', 'TQOD'].includes(boardId)
  const market = isBond ? 'bonds' : 'shares'

  // Default: last 365 days — ensures 1W/1M/3M filters all have data
  const defaultFrom = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)
  const fromDate = from || defaultFrom

  let url = `${MOEX_BASE_URL}/history/engines/stock/markets/${market}/boards/${boardId}/securities/${ticker}.json?limit=365&from=${fromDate}`
  if (till) url += `&till=${till}`

  const response = await fetch(url, { next: { revalidate: 3600 } })
  if (!response.ok) return []

  const json = await response.json()
  const history = json.history
  if (!history?.data?.length) return []

  return parseResponse<{
    TRADEDATE: string
    CLOSE: number
    LEGALCLOSEPRICE: number
    WAPRICE: number
    VOLUME: number
    FACEVALUE: number
  }>(history)
    .map(row => ({
      date: row.TRADEDATE,
      // Bonds: LEGALCLOSEPRICE — % of face value → roubles
      // Shares: CLOSE or WAPRICE
      close: isBond
        ? ((row.LEGALCLOSEPRICE || row.CLOSE || 0) / 100) * (row.FACEVALUE || 1000)
        : (row.CLOSE || row.WAPRICE || 0),
      volume: row.VOLUME || 0,
    }))
    .filter(row => row.close > 0)
}

// Get bond coupons
export async function getBondCoupons(ticker: string): Promise<{
  couponDate: string
  recordDate: string
  value: number
}[]> {
  const url = `${MOEX_BASE_URL}/securities/${ticker}/bondization.json`
  
  const response = await fetch(url, { next: { revalidate: 86400 } })
  if (!response.ok) return []
  
  const json = await response.json()
  const coupons = json.coupons
  
  if (!coupons?.data?.length) return []
  
  return parseResponse<{
    coupondate: string
    recorddate: string
    value_rub: number
  }>(coupons).map(c => ({
    couponDate: c.coupondate,
    recordDate: c.recorddate,
    value: c.value_rub
  }))
}

// Get dividends for stock
export async function getStockDividends(ticker: string): Promise<{
  registryCloseDate: string
  value: number
  currencyId: string
}[]> {
  const url = `${MOEX_BASE_URL}/securities/${ticker}/dividends.json`
  
  const response = await fetch(url, { next: { revalidate: 86400 } })
  if (!response.ok) return []
  
  const json = await response.json()
  const dividends = json.dividends
  
  if (!dividends?.data?.length) return []
  
  return parseResponse<{
    registryclosedate: string
    value: number
    currencyid: string
  }>(dividends).map(d => ({
    registryCloseDate: d.registryclosedate,
    value: d.value,
    currencyId: d.currencyid
  }))
}

// Determine instrument type from MOEX type
export function mapMoexType(type: string): 'bond' | 'stock' | 'etf' {
  const bondTypes = ['corporate_bond', 'exchange_bond', 'ofz_bond', 'subfederal_bond', 'municipal_bond', 'euro_bond']
  const etfTypes = ['etf_ppif', 'etf', 'stock_ppif']
  
  if (bondTypes.some(t => type.toLowerCase().includes(t) || type.toLowerCase().includes('облигаци'))) {
    return 'bond'
  }
  if (etfTypes.some(t => type.toLowerCase().includes(t) || type.toLowerCase().includes('фонд') || type.toLowerCase().includes('пиф'))) {
    return 'etf'
  }
  return 'stock'
}
