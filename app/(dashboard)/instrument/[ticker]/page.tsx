import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { InstrumentInfo } from '@/components/instrument/instrument-info'
import { InstrumentChart } from '@/components/instrument/instrument-chart'
import { InstrumentPayments } from '@/components/instrument/instrument-payments'
import { InstrumentAiSummary } from '@/components/instrument/instrument-ai-summary'
import { InstrumentPosition } from '@/components/instrument/instrument-position'
import type { Instrument, PositionWithInstrument } from '@/lib/types/database'
import { getSecurityInfo, getMarketData, getBondCoupons, getHistoricalPrices, mapMoexType } from '@/lib/services/moex'

interface Props {
  params: Promise<{ ticker: string }>
}

async function getOrCreateInstrument(ticker: string): Promise<Instrument | null> {
  const supabase = await createClient()
  
  // Check if instrument exists in DB
  const { data: existing } = await supabase
    .from('instruments')
    .select('*')
    .eq('ticker', ticker.toUpperCase())
    .single()
  
  if (existing) {
    // Update price if stale (older than 5 minutes)
    const lastUpdate = existing.price_updated_at ? new Date(existing.price_updated_at) : null
    const isStale = !lastUpdate || (Date.now() - lastUpdate.getTime() > 5 * 60 * 1000)
    
    if (isStale) {
      try {
        const marketData = await getMarketData(ticker, existing.board_id || 'TQBR')
        if (marketData) {
          await supabase
            .from('instruments')
            .update({
              last_price: marketData.price,
              price_change_percent: marketData.priceChange,
              price_updated_at: new Date().toISOString(),
            })
            .eq('id', existing.id)
          
          return {
            ...existing,
            last_price: marketData.price,
            price_change_percent: marketData.priceChange,
          } as Instrument
        }
      } catch {
        // Ignore price update errors, return existing data
      }
    }
    
    return existing as Instrument
  }
  
  // Fetch from MOEX and create
  try {
    const info = await getSecurityInfo(ticker)
    if (!info) return null
    
    const instrumentType = mapMoexType(info.type)
    const marketData = await getMarketData(ticker, info.boardId)
    
    const { data: created, error } = await supabase
      .from('instruments')
      .insert({
        ticker: info.ticker,
        isin: info.isin,
        name: info.name,
        short_name: info.shortName,
        instrument_type: instrumentType,
        board_id: info.boardId,
        face_value: info.faceValue,
        coupon_value: info.couponValue,
        coupon_rate: info.couponPercent,
        maturity_date: info.maturityDate,
        lot_size: info.lotSize,
        last_price: marketData?.price || null,
        price_change_percent: marketData?.priceChange || null,
        price_updated_at: marketData ? new Date().toISOString() : null,
      })
      .select()
      .single()
    
    if (error) throw error
    return created as Instrument
  } catch (e) {
    console.error('Failed to create instrument:', e)
    return null
  }
}

async function getUserPosition(
  userId: string,
  instrumentId: string
): Promise<PositionWithInstrument | null> {
  const supabase = await createClient()
  
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  
  if (!portfolios?.length) return null
  
  const { data: position } = await supabase
    .from('positions')
    .select('*, instrument:instruments(*)')
    .eq('portfolio_id', portfolios[0].id)
    .eq('instrument_id', instrumentId)
    .single()
  
  return position as PositionWithInstrument | null
}

export default async function InstrumentPage({ params }: Props) {
  const { ticker } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const instrument = await getOrCreateInstrument(ticker)
  
  if (!instrument) {
    notFound()
  }
  
  const [position, coupons, priceHistory] = await Promise.all([
    getUserPosition(user.id, instrument.id),
    instrument.instrument_type === 'bond' ? getBondCoupons(ticker) : Promise.resolve([]),
    getHistoricalPrices(ticker, instrument.board_id || 'TQBR'),
  ])

  return (
    <div className="flex flex-col">
      <DashboardHeader title={instrument.ticker} />
      
      <div className="flex-1 p-4 md:p-6">
        <div className="flex flex-col gap-6">
          {/* Instrument Info */}
          <InstrumentInfo instrument={instrument} />
          
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 flex flex-col gap-6">
              {/* Price Chart */}
              <InstrumentChart 
                instrument={instrument} 
                priceHistory={priceHistory}
              />
              
              {/* AI Summary */}
              <InstrumentAiSummary 
                instrument={instrument}
                userId={user.id}
              />
            </div>
            
            <div className="flex flex-col gap-6">
              {/* User Position */}
              <InstrumentPosition 
                instrument={instrument}
                position={position}
              />
              
              {/* Payments (for bonds) */}
              {instrument.instrument_type === 'bond' && coupons.length > 0 && (
                <InstrumentPayments 
                  instrument={instrument}
                  coupons={coupons}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
