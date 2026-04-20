import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getBondCoupons, getStockDividends } from '@/lib/services/moex'
import type { PositionWithInstrument } from '@/lib/types/database'

const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN!
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`

// Supabase admin client (bypasses RLS to look up users by telegram_chat_id)
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

async function sendMessage(chatId: number, text: string, parseMode = 'HTML') {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: parseMode }),
  })
}

function formatMoney(n: number) {
  return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

async function getUserByChat(chatId: number) {
  const supabase = getAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('id')
    .eq('telegram_chat_id', chatId)
    .single()
  return data
}

async function getPositions(userId: string) {
  const supabase = getAdminClient()
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('id, name')
    .eq('user_id', userId)
    .order('is_default', { ascending: false })
    .limit(1)
  if (!portfolios?.length) return []

  const { data: positions } = await supabase
    .from('positions')
    .select('*, instrument:instruments(*)')
    .eq('portfolio_id', portfolios[0].id)
  return (positions || []) as PositionWithInstrument[]
}

async function handleStart(chatId: number) {
  await sendMessage(chatId, `
<b>Tez Invest AI Bot</b>

Привет! Я помогу отслеживать выплаты по вашему инвестиционному портфелю.

<b>Для подключения:</b>
1. Войдите на tez-invest-ai.vercel.app
2. Перейдите в Настройки → Telegram
3. Введите ваш Chat ID: <code>${chatId}</code>

<b>Команды:</b>
/payments — ближайшие выплаты
/forecast — прогноз дохода на год
/portfolio — состав портфеля
/help — справка
  `.trim())
}

async function handlePayments(chatId: number) {
  const user = await getUserByChat(chatId)
  if (!user) {
    await sendMessage(chatId, '❌ Аккаунт не привязан. Используйте /start для инструкций.')
    return
  }

  const positions = await getPositions(user.id)
  if (!positions.length) {
    await sendMessage(chatId, '📭 Портфель пуст. Добавьте позиции на сайте.')
    return
  }

  const now = new Date()
  const upcoming: { date: string; name: string; ticker: string; total: number; type: string }[] = []

  for (const pos of positions) {
    const { instrument } = pos
    if (instrument.instrument_type === 'bond') {
      try {
        const coupons = await getBondCoupons(instrument.ticker)
        for (const c of coupons) {
          const d = new Date(c.couponDate)
          const diff = (d.getTime() - now.getTime()) / 86400000
          if (diff >= 0 && diff <= 90 && c.value > 0) {
            upcoming.push({ date: c.couponDate, name: instrument.short_name || instrument.name, ticker: instrument.ticker, total: c.value * pos.quantity, type: 'Купон' })
          }
        }
      } catch {}
    }
    if (instrument.instrument_type === 'stock') {
      try {
        const divs = await getStockDividends(instrument.ticker)
        for (const d of divs) {
          const dt = new Date(d.registryCloseDate)
          const diff = (dt.getTime() - now.getTime()) / 86400000
          if (diff >= 0 && diff <= 90 && d.value > 0) {
            upcoming.push({ date: d.registryCloseDate, name: instrument.short_name || instrument.name, ticker: instrument.ticker, total: d.value * pos.quantity, type: 'Дивиденд' })
          }
        }
      } catch {}
    }
  }

  upcoming.sort((a, b) => a.date.localeCompare(b.date))

  if (!upcoming.length) {
    await sendMessage(chatId, '📅 В ближайшие 90 дней выплат не ожидается.')
    return
  }

  const total = upcoming.reduce((s, p) => s + p.total, 0)
  const lines = upcoming.slice(0, 10).map(p =>
    `📌 <b>${p.ticker}</b> ${p.type} · ${formatDate(p.date)}\n   +${formatMoney(p.total)}`
  ).join('\n\n')

  await sendMessage(chatId, `
<b>Ближайшие выплаты (90 дней)</b>

${lines}

<b>Итого: +${formatMoney(total)}</b>
  `.trim())
}

async function handleForecast(chatId: number) {
  const user = await getUserByChat(chatId)
  if (!user) {
    await sendMessage(chatId, '❌ Аккаунт не привязан. Используйте /start для инструкций.')
    return
  }

  const positions = await getPositions(user.id)
  if (!positions.length) {
    await sendMessage(chatId, '📭 Портфель пуст.')
    return
  }

  const now = new Date()
  const MONTHS_RU = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']
  const monthly: Record<string, number> = {}

  for (const pos of positions) {
    const { instrument } = pos
    if (instrument.instrument_type === 'bond') {
      try {
        const coupons = await getBondCoupons(instrument.ticker)
        for (const c of coupons) {
          const d = new Date(c.couponDate)
          const diff = (d.getTime() - now.getTime()) / 86400000
          if (diff >= 0 && diff <= 365 && c.value > 0) {
            const key = c.couponDate.slice(0, 7)
            monthly[key] = (monthly[key] || 0) + c.value * pos.quantity
          }
        }
      } catch {}
    }
    if (instrument.instrument_type === 'stock') {
      try {
        const divs = await getStockDividends(instrument.ticker)
        for (const d of divs) {
          const dt = new Date(d.registryCloseDate)
          const diff = (dt.getTime() - now.getTime()) / 86400000
          if (diff >= 0 && diff <= 365 && d.value > 0) {
            const key = d.registryCloseDate.slice(0, 7)
            monthly[key] = (monthly[key] || 0) + d.value * pos.quantity
          }
        }
      } catch {}
    }
  }

  const total = Object.values(monthly).reduce((s, v) => s + v, 0)
  const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b))

  const maxBar = Math.max(...sorted.map(([, v]) => v), 1)
  const lines = sorted.map(([key, amount]) => {
    const [y, m] = key.split('-')
    const monthName = MONTHS_RU[parseInt(m) - 1]
    const barLen = Math.round((amount / maxBar) * 8)
    const bar = '█'.repeat(barLen) + '░'.repeat(8 - barLen)
    return `${monthName} ${y.slice(2)} <code>${bar}</code> ${formatMoney(amount)}`
  }).join('\n')

  await sendMessage(chatId, `
<b>Прогноз пассивного дохода (12 мес.)</b>

${lines || 'Нет данных'}

<b>Итого за год: +${formatMoney(total)}</b>
Среднемесячно: ~${formatMoney(total / 12)}
  `.trim())
}

async function handlePortfolio(chatId: number) {
  const user = await getUserByChat(chatId)
  if (!user) {
    await sendMessage(chatId, '❌ Аккаунт не привязан. Используйте /start для инструкций.')
    return
  }

  const positions = await getPositions(user.id)
  if (!positions.length) {
    await sendMessage(chatId, '📭 Портфель пуст.')
    return
  }

  const lines = positions.slice(0, 15).map(pos => {
    const price = pos.instrument.last_price || 0
    const value = price * pos.quantity
    const typeEmoji = pos.instrument.instrument_type === 'bond' ? '📋' : pos.instrument.instrument_type === 'etf' ? '📦' : '📈'
    return `${typeEmoji} <b>${pos.instrument.ticker}</b> · ${pos.quantity} шт. · ${formatMoney(value)}`
  }).join('\n')

  const total = positions.reduce((s, p) => s + (p.instrument.last_price || 0) * p.quantity, 0)

  await sendMessage(chatId, `
<b>Ваш портфель</b> (${positions.length} позиций)

${lines}

<b>Стоимость: ~${formatMoney(total)}</b>
  `.trim())
}

export async function POST(request: Request) {
  try {
    if (!TELEGRAM_TOKEN) {
      return NextResponse.json({ error: 'Bot not configured' }, { status: 500 })
    }

    const body = await request.json()
    const message = body?.message
    if (!message) return NextResponse.json({ ok: true })

    const chatId: number = message.chat?.id
    const text: string = message.text || ''
    const command = text.split(' ')[0].split('@')[0].toLowerCase()

    // Handle commands
    if (command === '/start' || command === '/help') {
      await handleStart(chatId)
    } else if (command === '/payments' || command === '/выплаты') {
      await handlePayments(chatId)
    } else if (command === '/forecast' || command === '/прогноз') {
      await handleForecast(chatId)
    } else if (command === '/portfolio' || command === '/портфель') {
      await handlePortfolio(chatId)
    } else {
      await sendMessage(chatId, 'Не понял команду. Используйте /help для списка команд.')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true }) // Always return 200 to Telegram
  }
}

// GET endpoint to register webhook
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')
  if (secret !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/telegram`
  const res = await fetch(`${TELEGRAM_API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)
  const data = await res.json()
  return NextResponse.json(data)
}
