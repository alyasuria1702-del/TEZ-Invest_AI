import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const TYPE_LABELS: Record<string, string> = {
  bond: 'Облигация',
  stock: 'Акция',
  etf: 'Фонд/ETF',
}

function buildPrompt(data: {
  ticker: string
  name: string
  instrumentType: string
  lastPrice: number | null
  priceChangePercent: number | null
  couponRate: number | null
  couponValue: number | null
  maturityDate: string | null
}): string {
  const typeLabel = TYPE_LABELS[data.instrumentType] || data.instrumentType
  const priceInfo = data.lastPrice
    ? `Текущая цена: ${data.lastPrice} руб.`
    : 'Цена недоступна'
  const changeInfo = data.priceChangePercent != null
    ? `Изменение за день: ${data.priceChangePercent > 0 ? '+' : ''}${data.priceChangePercent.toFixed(2)}%`
    : ''
  const couponInfo = data.couponRate
    ? `Купонная ставка: ${data.couponRate}%. Размер купона: ${data.couponValue ? data.couponValue + ' руб.' : 'н/д'}`
    : ''
  const maturityInfo = data.maturityDate
    ? `Дата погашения: ${data.maturityDate}`
    : ''

  return `Ты — аналитический ИИ-помощник для начинающих инвесторов. Твоя задача — дать краткий, нейтральный информационный вывод по инструменту на основе предоставленных данных.

Инструмент: ${data.ticker} — ${data.name}
Тип: ${typeLabel}
${priceInfo}
${changeInfo}
${couponInfo}
${maturityInfo}

Напиши краткий аналитический вывод из 2–4 предложений. Включи:
1. Что представляет собой этот инструмент
2. Как изменилась его стоимость (если есть данные)
3. Информацию о выплатах (для облигаций — купоны, для акций — дивиденды, если есть данные)
4. Нейтральный комментарий для наблюдения

ВАЖНО: Не давай персональных инвестиционных рекомендаций. Не используй слова "купить", "продать", "рекомендую". Пиши на русском языке. Только информационный характер.`
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      instrumentId,
      ticker,
      name,
      instrumentType,
      lastPrice,
      priceChangePercent,
      couponRate,
      couponValue,
      maturityDate,
      forceRefresh = false,
    } = body

    if (!instrumentId || !ticker) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Check cache unless forceRefresh
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('ai_summaries')
        .select('*')
        .eq('instrument_id', instrumentId)
        .eq('user_id', user.id)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single()

      if (cached) {
        const generatedAt = new Date(cached.generated_at)
        const ageHours = (Date.now() - generatedAt.getTime()) / (1000 * 60 * 60)

        // Return cached if less than 24 hours old
        if (ageHours < 24) {
          return NextResponse.json({
            summary: cached.summary,
            generatedAt: cached.generated_at,
            fromCache: true,
          })
        }
      }
    }

    // Generate new summary via Anthropic
    const prompt = buildPrompt({
      ticker,
      name,
      instrumentType,
      lastPrice,
      priceChangePercent,
      couponRate,
      couponValue,
      maturityDate,
    })

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    })

    const summaryText = message.content
      .filter(block => block.type === 'text')
      .map(block => (block as { type: 'text'; text: string }).text)
      .join('')
      .trim()

    const generatedAt = new Date().toISOString()

    // Save to DB (upsert pattern: delete old, insert new)
    await supabase
      .from('ai_summaries')
      .delete()
      .eq('instrument_id', instrumentId)
      .eq('user_id', user.id)

    await supabase
      .from('ai_summaries')
      .insert({
        instrument_id: instrumentId,
        user_id: user.id,
        summary: summaryText,
        generated_at: generatedAt,
      })

    return NextResponse.json({
      summary: summaryText,
      generatedAt,
      fromCache: false,
    })
  } catch (error) {
    console.error('AI summary error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}
