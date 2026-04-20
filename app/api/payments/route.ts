import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBondCoupons, getStockDividends } from '@/lib/services/moex'
import type { PositionWithInstrument } from '@/lib/types/database'

export interface PaymentItem {
  ticker: string
  instrumentName: string
  instrumentType: 'bond' | 'stock' | 'etf'
  paymentType: 'coupon' | 'dividend'
  date: string
  amountPerUnit: number
  totalAmount: number
  currency: string
  status: 'upcoming' | 'past'
}

async function getPortfolioId(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, requestedId: string | null) {
  if (requestedId) {
    const { data } = await supabase.from('portfolios').select('id').eq('id', requestedId).eq('user_id', userId).single()
    return data?.id ?? null
  }
  const { data } = await supabase.from('portfolios').select('id').eq('user_id', userId).order('is_default', { ascending: false }).limit(1)
  return data?.[0]?.id ?? null
}

async function fetchPayments(positions: PositionWithInstrument[], daysBack: number, daysAhead: number): Promise<PaymentItem[]> {
  const now = new Date()
  const allPayments: PaymentItem[] = []

  for (const pos of positions) {
    const { instrument } = pos
    if (instrument.instrument_type === 'bond') {
      try {
        const coupons = await getBondCoupons(instrument.ticker)
        for (const coupon of coupons) {
          if (!coupon.value || coupon.value <= 0) continue
          const d = new Date(coupon.couponDate)
          const diffDays = (d.getTime() - now.getTime()) / 86400000
          if (diffDays < -daysBack || diffDays > daysAhead) continue
          allPayments.push({
            ticker: instrument.ticker,
            instrumentName: instrument.short_name || instrument.name,
            instrumentType: 'bond',
            paymentType: 'coupon',
            date: coupon.couponDate,
            amountPerUnit: coupon.value,
            totalAmount: coupon.value * pos.quantity,
            currency: instrument.currency || 'RUB',
            status: d >= now ? 'upcoming' : 'past',
          })
        }
      } catch { /* skip */ }
    }
    if (instrument.instrument_type === 'stock') {
      try {
        const dividends = await getStockDividends(instrument.ticker)
        for (const div of dividends) {
          if (!div.value || div.value <= 0) continue
          const d = new Date(div.registryCloseDate)
          const diffDays = (now.getTime() - d.getTime()) / 86400000
          if (diffDays > daysBack) continue
          allPayments.push({
            ticker: instrument.ticker,
            instrumentName: instrument.short_name || instrument.name,
            instrumentType: 'stock',
            paymentType: 'dividend',
            date: div.registryCloseDate,
            amountPerUnit: div.value,
            totalAmount: div.value * pos.quantity,
            currency: div.currencyId || instrument.currency || 'RUB',
            status: d >= now ? 'upcoming' : 'past',
          })
        }
      } catch { /* skip */ }
    }
  }
  return allPayments
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const requestedPortfolioId = searchParams.get('portfolioId')
    const mode = searchParams.get('mode') // 'calendar' | 'forecast' | default

    const portfolioId = await getPortfolioId(supabase, user.id, requestedPortfolioId)
    if (!portfolioId) return NextResponse.json({ payments: [] })

    const { data: positions } = await supabase
      .from('positions')
      .select('*, instrument:instruments(*)')
      .eq('portfolio_id', portfolioId)

    if (!positions?.length) return NextResponse.json({ payments: [] })

    const typedPositions = positions as PositionWithInstrument[]

    // Calendar & forecast modes: full year ahead + 3 months past
    const daysBack = mode === 'calendar' || mode === 'forecast' ? 90 : 90
    const daysAhead = mode === 'calendar' || mode === 'forecast' ? 365 : 365

    const allPayments = await fetchPayments(typedPositions, daysBack, daysAhead)

    allPayments.sort((a, b) => {
      if (a.status === 'upcoming' && b.status === 'past') return -1
      if (a.status === 'past' && b.status === 'upcoming') return 1
      if (a.status === 'upcoming') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    const limit = mode === 'calendar' || mode === 'forecast' ? 500 : 20
    return NextResponse.json({ payments: allPayments.slice(0, limit) })
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
