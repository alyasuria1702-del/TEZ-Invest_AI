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
  status: 'upcoming' | 'past'
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Support filtering by specific portfolio via query param
    const { searchParams } = new URL(request.url)
    const requestedPortfolioId = searchParams.get('portfolioId')

    let portfolioId: string
    if (requestedPortfolioId) {
      // Verify ownership
      const { data: p } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', requestedPortfolioId)
        .eq('user_id', user.id)
        .single()
      if (!p) return NextResponse.json({ payments: [] })
      portfolioId = p.id
    } else {
      // Fall back to default/first portfolio
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)
      if (!portfolios?.length) return NextResponse.json({ payments: [] })
      portfolioId = portfolios[0].id
    }

    const { data: positions } = await supabase
      .from('positions')
      .select('*, instrument:instruments(*)')
      .eq('portfolio_id', portfolioId)

    if (!positions?.length) {
      return NextResponse.json({ payments: [] })
    }

    const typedPositions = positions as PositionWithInstrument[]
    const now = new Date()
    const allPayments: PaymentItem[] = []

    for (const pos of typedPositions) {
      const { instrument } = pos

      if (instrument.instrument_type === 'bond') {
        try {
          const coupons = await getBondCoupons(instrument.ticker)
          const relevant = coupons.filter(c => {
            const d = new Date(c.couponDate)
            const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            return diffDays > -90 && diffDays < 365 // -90 days past to 1 year ahead
          })

          for (const coupon of relevant) {
            if (coupon.value > 0) {
              const couponDate = new Date(coupon.couponDate)
              allPayments.push({
                ticker: instrument.ticker,
                instrumentName: instrument.short_name || instrument.name,
                instrumentType: 'bond',
                paymentType: 'coupon',
                date: coupon.couponDate,
                amountPerUnit: coupon.value,
                totalAmount: coupon.value * pos.quantity,
                status: couponDate >= now ? 'upcoming' : 'past',
              })
            }
          }
        } catch {
          // Ignore errors for individual instruments
        }
      }

      if (instrument.instrument_type === 'stock') {
        try {
          const dividends = await getStockDividends(instrument.ticker)
          const recent = dividends.filter(d => {
            const date = new Date(d.registryCloseDate)
            const diffDays = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
            return diffDays < 365 // last 1 year
          })

          for (const div of recent) {
            if (div.value > 0) {
              const divDate = new Date(div.registryCloseDate)
              allPayments.push({
                ticker: instrument.ticker,
                instrumentName: instrument.short_name || instrument.name,
                instrumentType: 'stock',
                paymentType: 'dividend',
                date: div.registryCloseDate,
                amountPerUnit: div.value,
                totalAmount: div.value * pos.quantity,
                status: divDate >= now ? 'upcoming' : 'past',
              })
            }
          }
        } catch {
          // Ignore errors for individual instruments
        }
      }
    }

    // Sort: upcoming first by date ASC, then past by date DESC
    allPayments.sort((a, b) => {
      if (a.status === 'upcoming' && b.status === 'past') return -1
      if (a.status === 'past' && b.status === 'upcoming') return 1
      if (a.status === 'upcoming') return new Date(a.date).getTime() - new Date(b.date).getTime()
      return new Date(b.date).getTime() - new Date(a.date).getTime()
    })

    return NextResponse.json({ payments: allPayments.slice(0, 20) })
  } catch (error) {
    console.error('Payments API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
