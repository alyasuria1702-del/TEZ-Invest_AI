import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHistoricalPrices } from '@/lib/services/moex'
import type { PositionWithInstrument } from '@/lib/types/database'

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const days = Math.min(parseInt(searchParams.get('days') || '30'), 365)
    const requestedPortfolioId = searchParams.get('portfolioId')

    // Get user's portfolio and positions
    let portfolioId: string
    if (requestedPortfolioId) {
      const { data: p } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', requestedPortfolioId)
        .eq('user_id', user.id)
        .single()
      if (!p) return NextResponse.json({ chartData: [] })
      portfolioId = p.id
    } else {
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)
      if (!portfolios?.length) return NextResponse.json({ chartData: [] })
      portfolioId = portfolios[0].id
    }

    const { data: positions } = await supabase
      .from('positions')
      .select('*, instrument:instruments(*)')
      .eq('portfolio_id', portfolioId)

    if (!positions?.length) {
      return NextResponse.json({ chartData: [] })
    }

    const typedPositions = positions as PositionWithInstrument[]

    // Build date range
    const today = new Date()
    const fromDate = new Date(today)
    fromDate.setDate(fromDate.getDate() - days)
    const fromStr = fromDate.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]

    // Build all trading dates in range
    const allDates: string[] = []
    const cursor = new Date(fromDate)
    while (cursor <= today) {
      const dow = cursor.getDay()
      if (dow !== 0 && dow !== 6) { // skip weekends
        allDates.push(cursor.toISOString().split('T')[0])
      }
      cursor.setDate(cursor.getDate() + 1)
    }

    // For each instrument, try to get price history from DB first, then MOEX
    const pricesByInstrument: Map<string, Map<string, number>> = new Map()

    for (const pos of typedPositions) {
      const instrumentId = pos.instrument_id
      const ticker = pos.instrument.ticker
      const boardId = pos.instrument.board_id || 'TQBR'

      // Check DB cache
      const { data: dbHistory } = await supabase
        .from('price_history')
        .select('trade_date, close_price')
        .eq('instrument_id', instrumentId)
        .gte('trade_date', fromStr)
        .lte('trade_date', todayStr)
        .order('trade_date', { ascending: true })

      const priceMap = new Map<string, number>()

      if (dbHistory && dbHistory.length >= Math.floor(days * 0.5)) {
        // Have enough data in DB
        dbHistory.forEach(row => {
          priceMap.set(row.trade_date, row.close_price)
        })
      } else {
        // Fetch from MOEX and cache
        try {
          const moexHistory = await getHistoricalPrices(ticker, boardId, fromStr, todayStr)

          const toInsert = moexHistory
            .filter(h => h.close > 0)
            .map(h => ({
              instrument_id: instrumentId,
              trade_date: h.date,
              close_price: h.close,
              volume: h.volume || null,
            }))

          if (toInsert.length > 0) {
            await supabase
              .from('price_history')
              .upsert(toInsert, { onConflict: 'instrument_id,trade_date' })
          }

          moexHistory.forEach(h => {
            if (h.close > 0) priceMap.set(h.date, h.close)
          })
        } catch {
          // Fallback: use current price for all dates
        }
      }

      // Fill gaps using last known price (forward fill)
      let lastKnownPrice = pos.instrument.last_price || pos.average_buy_price
      const filled = new Map<string, number>()

      for (const date of allDates) {
        if (priceMap.has(date)) {
          lastKnownPrice = priceMap.get(date)!
        }
        filled.set(date, lastKnownPrice)
      }

      pricesByInstrument.set(instrumentId, filled)
    }

    // Calculate total portfolio value per date
    const chartData = allDates.map(date => {
      let totalValue = 0
      for (const pos of typedPositions) {
        const prices = pricesByInstrument.get(pos.instrument_id)
        const price = prices?.get(date) || pos.instrument.last_price || pos.average_buy_price
        totalValue += price * pos.quantity
      }
      return {
        date,
        value: Math.round(totalValue),
        label: new Date(date + 'T00:00:00').toLocaleDateString('ru-RU', {
          day: 'numeric',
          month: 'short',
        }),
      }
    })

    return NextResponse.json({ chartData })
  } catch (error) {
    console.error('Portfolio history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
