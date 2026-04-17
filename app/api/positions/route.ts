import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getSecurityInfo, getMarketData, mapMoexType } from '@/lib/services/moex'

// POST /api/positions — add position
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { ticker, quantity, averageBuyPrice, purchaseDate, brokerAccount, portfolioId: requestedPortfolioId } = body

    if (!ticker || !quantity || !averageBuyPrice) {
      return NextResponse.json({ error: 'ticker, quantity и averageBuyPrice обязательны' }, { status: 400 })
    }

    if (quantity <= 0 || averageBuyPrice <= 0) {
      return NextResponse.json({ error: 'Количество и цена должны быть положительными' }, { status: 400 })
    }

    // Determine target portfolio
    let portfolioId: string

    if (requestedPortfolioId) {
      // Verify that this portfolio belongs to the user
      const { data: targetPortfolio } = await supabase
        .from('portfolios')
        .select('id')
        .eq('id', requestedPortfolioId)
        .eq('user_id', user.id)
        .single()
      if (!targetPortfolio) {
        return NextResponse.json({ error: 'Портфель не найден' }, { status: 404 })
      }
      portfolioId = targetPortfolio.id
    } else {
      // Fall back to default or first portfolio, creating one if needed
      const { data: portfolios } = await supabase
        .from('portfolios')
        .select('id')
        .eq('user_id', user.id)
        .order('is_default', { ascending: false })
        .limit(1)

      if (!portfolios?.length) {
        const { data: newPortfolio, error } = await supabase
          .from('portfolios')
          .insert({ user_id: user.id, name: 'Мой портфель', is_default: true })
          .select('id')
          .single()

        if (error || !newPortfolio) {
          return NextResponse.json({ error: 'Не удалось создать портфель' }, { status: 500 })
        }
        portfolioId = newPortfolio.id
      } else {
        portfolioId = portfolios[0].id
      }
    }

    // Get or create instrument
    const tickerUpper = ticker.toUpperCase().trim()

    let { data: instrument } = await supabase
      .from('instruments')
      .select('id')
      .eq('ticker', tickerUpper)
      .single()

    if (!instrument) {
      // Fetch from MOEX
      const info = await getSecurityInfo(tickerUpper)

      if (!info) {
        return NextResponse.json({ error: `Инструмент "${tickerUpper}" не найден на MOEX` }, { status: 404 })
      }

      const instrumentType = mapMoexType(info.type)
      const marketData = await getMarketData(tickerUpper, info.boardId).catch(() => null)

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
          last_price: marketData?.price ?? null,
          price_change_percent: marketData?.priceChange ?? null,
          price_updated_at: marketData ? new Date().toISOString() : null,
        })
        .select('id')
        .single()

      if (error || !created) {
        return NextResponse.json({ error: 'Ошибка создания инструмента' }, { status: 500 })
      }

      instrument = created
    }

    // Check if position already exists — update quantity and average price
    const { data: existingPosition } = await supabase
      .from('positions')
      .select('id, quantity, average_buy_price')
      .eq('portfolio_id', portfolioId)
      .eq('instrument_id', instrument.id)
      .single()

    if (existingPosition) {
      // Weighted average price calculation
      const totalQty = existingPosition.quantity + quantity
      const newAvgPrice =
        (existingPosition.average_buy_price * existingPosition.quantity + averageBuyPrice * quantity) / totalQty

      const { error } = await supabase
        .from('positions')
        .update({
          quantity: totalQty,
          average_buy_price: newAvgPrice,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPosition.id)

      if (error) {
        return NextResponse.json({ error: 'Ошибка обновления позиции' }, { status: 500 })
      }

      return NextResponse.json({ success: true, action: 'updated', ticker: tickerUpper })
    }

    // Create new position
    const { error } = await supabase
      .from('positions')
      .insert({
        portfolio_id: portfolioId,
        instrument_id: instrument.id,
        quantity,
        average_buy_price: averageBuyPrice,
        purchase_date: purchaseDate || null,
        broker_account: brokerAccount || null,
      })

    if (error) {
      return NextResponse.json({ error: 'Ошибка создания позиции' }, { status: 500 })
    }

    return NextResponse.json({ success: true, action: 'created', ticker: tickerUpper })
  } catch (error) {
    console.error('Position API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/positions — remove position
export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { positionId } = await req.json()

    if (!positionId) {
      return NextResponse.json({ error: 'positionId обязателен' }, { status: 400 })
    }

    // Verify ownership via portfolio
    const { data: position } = await supabase
      .from('positions')
      .select('id, portfolio:portfolios(user_id)')
      .eq('id', positionId)
      .single()

    if (!position) {
      return NextResponse.json({ error: 'Позиция не найдена' }, { status: 404 })
    }

    const { error } = await supabase
      .from('positions')
      .delete()
      .eq('id', positionId)

    if (error) {
      return NextResponse.json({ error: 'Ошибка удаления позиции' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete position error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
