// Supabase Edge Function: telegram-bot
// Webhook handler for Telegram bot commands
// Deploy: supabase functions deploy telegram-bot
//
// Register webhook:
// curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
//   -d "url=https://<PROJECT>.supabase.co/functions/v1/telegram-bot" \
//   -d "secret_token=<WEBHOOK_SECRET>"

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TG = (token: string) => `https://api.telegram.org/bot${token}`
const MOEX = 'https://iss.moex.com/iss'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number, cur = 'RUB') {
  if (cur === 'RUB') return `${Math.round(n).toLocaleString('ru-RU')} ₽`
  if (cur === 'USD') return `$${n.toFixed(2)}`
  return `${n.toFixed(2)} ${cur}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

function daysUntil(s: string) {
  const now = new Date(); now.setHours(0,0,0,0)
  const d = new Date(s); d.setHours(0,0,0,0)
  return Math.round((d.getTime() - now.getTime()) / 86400000)
}

async function tgSend(token: string, chatId: number, text: string) {
  await fetch(`${TG(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
}

// ─── MOEX data ────────────────────────────────────────────────────────────────

async function getCoupons(ticker: string): Promise<{ date: string; value: number }[]> {
  try {
    const r = await fetch(`${MOEX}/securities/${ticker}/bondization.json?iss.meta=off&limit=100`)
    const j = await r.json()
    const cols: string[] = j.coupons?.columns ?? []
    const rows: unknown[][] = j.coupons?.data ?? []
    const dateIdx = cols.indexOf('coupondate')
    const valIdx = cols.indexOf('value')
    return rows
      .map(row => ({ date: String(row[dateIdx]), value: Number(row[valIdx]) || 0 }))
      .filter(c => c.value > 0)
  } catch { return [] }
}

async function getDividends(ticker: string): Promise<{ date: string; value: number; currency: string }[]> {
  try {
    const r = await fetch(`${MOEX}/securities/${ticker}/dividends.json?iss.meta=off`)
    const j = await r.json()
    const cols: string[] = j.dividends?.columns ?? []
    const rows: unknown[][] = j.dividends?.data ?? []
    const dateIdx = cols.indexOf('registryclosedate')
    const valIdx = cols.indexOf('value')
    const curIdx = cols.indexOf('currencyid')
    return rows
      .map(row => ({ date: String(row[dateIdx]), value: Number(row[valIdx]) || 0, currency: String(row[curIdx] || 'RUB') }))
      .filter(d => d.value > 0)
  } catch { return [] }
}

// ─── Payment aggregation ─────────────────────────────────────────────────────

interface PayItem {
  ticker: string
  name: string
  type: 'coupon' | 'dividend'
  date: string
  perUnit: number
  total: number
  currency: string
  daysUntil: number
}

async function getPayments(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  portfolioId: string | null
): Promise<PayItem[]> {
  let pid = portfolioId
  if (!pid) {
    const { data } = await supabase.from('portfolios').select('id')
      .eq('user_id', userId).order('is_default', { ascending: false }).limit(1)
    pid = data?.[0]?.id
  }
  if (!pid) return []

  const { data: positions } = await supabase
    .from('positions')
    .select('quantity, instrument:instruments(ticker, short_name, name, instrument_type, currency)')
    .eq('portfolio_id', pid)
  if (!positions?.length) return []

  const now = new Date(); now.setHours(0,0,0,0)
  const items: PayItem[] = []

  for (const pos of positions as { quantity: number; instrument: { ticker: string; short_name?: string; name: string; instrument_type: string; currency?: string } }[]) {
    const inst = pos.instrument
    const name = inst.short_name || inst.name

    if (inst.instrument_type === 'bond') {
      const coupons = await getCoupons(inst.ticker)
      for (const c of coupons) {
        const d = new Date(c.date); d.setHours(0,0,0,0)
        const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
        if (diff < -30 || diff > 365) continue
        items.push({ ticker: inst.ticker, name, type: 'coupon', date: c.date, perUnit: c.value, total: c.value * pos.quantity, currency: inst.currency || 'RUB', daysUntil: diff })
      }
    }

    if (inst.instrument_type === 'stock') {
      const divs = await getDividends(inst.ticker)
      for (const d of divs) {
        const date = new Date(d.date); date.setHours(0,0,0,0)
        const diff = Math.round((date.getTime() - now.getTime()) / 86400000)
        if (diff < -30 || diff > 365) continue
        items.push({ ticker: inst.ticker, name, type: 'dividend', date: d.date, perUnit: d.value, total: d.value * pos.quantity, currency: d.currency, daysUntil: diff })
      }
    }
  }

  return items.sort((a, b) => a.daysUntil - b.daysUntil)
}

// ─── Commands ─────────────────────────────────────────────────────────────────

const HELP = `/payments — ближайшие выплаты\n/month — выплаты этого месяца\n/forecast — прогноз на 12 месяцев\n/portfolio — портфель с P&L\n/alerts — настройки оповещений\n/help — список команд`

async function cmdStart(supabase: ReturnType<typeof createClient>, token: string, chatId: number, tgId: number) {
  const { data } = await supabase.from('telegram_connections').select('user_id').eq('telegram_chat_id', tgId).single()
  if (data) {
    await tgSend(token, chatId, `✅ Аккаунт подключён.\n\n${HELP}`)
  } else {
    await tgSend(token, chatId,
      `👋 <b>Tez Invest AI</b>\n\nДля подключения:\n1. Откройте приложение\n2. Настройки → Telegram → Подключить\n3. Введите ваш ID: <code>${tgId}</code>`)
  }
}

async function cmdPayments(supabase: ReturnType<typeof createClient>, token: string, chatId: number, conn: { user_id: string; portfolio_id: string | null }) {
  const items = (await getPayments(supabase, conn.user_id, conn.portfolio_id)).filter(p => p.daysUntil >= 0).slice(0, 10)
  if (!items.length) { await tgSend(token, chatId, '📭 Ближайших выплат не найдено.'); return }

  let txt = '💰 <b>Ближайшие выплаты:</b>\n\n'
  for (const p of items) {
    const when = p.daysUntil === 0 ? '🔴 сегодня' : p.daysUntil === 1 ? '🟡 завтра' : `через ${p.daysUntil} дн.`
    const icon = p.type === 'coupon' ? '📎' : '💵'
    txt += `${icon} <b>${p.ticker}</b> — ${fmt(p.total, p.currency)}\n   ${fmtDate(p.date)} · ${when} · ${fmt(p.perUnit, p.currency)}/шт.\n\n`
  }
  const total = items.reduce((s, p) => s + p.total, 0)
  txt += `📊 Итого: <b>${fmt(total)}</b>`
  await tgSend(token, chatId, txt)
}

async function cmdMonth(supabase: ReturnType<typeof createClient>, token: string, chatId: number, conn: { user_id: string; portfolio_id: string | null }) {
  const now = new Date()
  const mk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const items = (await getPayments(supabase, conn.user_id, conn.portfolio_id)).filter(p => p.date?.startsWith(mk))
  if (!items.length) { await tgSend(token, chatId, '📭 В этом месяце выплат нет.'); return }

  const month = now.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
  let txt = `📅 <b>${month}:</b>\n\n`
  const byDate: Record<string, PayItem[]> = {}
  for (const p of items) { if (!byDate[p.date]) byDate[p.date] = []; byDate[p.date].push(p) }
  for (const [date, ps] of Object.entries(byDate).sort()) {
    const dayTotal = ps.reduce((s, p) => s + p.total, 0)
    txt += `📆 <b>${fmtDate(date)}</b> — ${fmt(dayTotal)}\n`
    for (const p of ps) txt += `   ${p.type === 'coupon' ? '📎' : '💵'} ${p.ticker}: ${fmt(p.total, p.currency)}\n`
    txt += '\n'
  }
  txt += `💳 <b>Итого: ${fmt(items.reduce((s,p)=>s+p.total,0))}</b>`
  await tgSend(token, chatId, txt)
}

async function cmdForecast(supabase: ReturnType<typeof createClient>, token: string, chatId: number, conn: { user_id: string; portfolio_id: string | null }) {
  const items = (await getPayments(supabase, conn.user_id, conn.portfolio_id)).filter(p => p.daysUntil >= 0)
  if (!items.length) { await tgSend(token, chatId, '📭 Нет данных для прогноза.'); return }

  const now = new Date()
  const months: Record<string, number> = {}
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()+i, 1)
    months[`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`] = 0
  }
  for (const p of items) { const k = p.date?.slice(0,7); if (k && k in months) months[k] += p.total }

  const total = Object.values(months).reduce((a,b)=>a+b,0)
  const maxVal = Math.max(...Object.values(months), 1)

  let txt = '📈 <b>Прогноз пассивного дохода:</b>\n\n'
  const mk = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  for (const [key, amount] of Object.entries(months)) {
    const [yr, mo] = key.split('-')
    const label = new Date(+yr, +mo-1, 1).toLocaleDateString('ru-RU', { month: 'short' })
    const bar = amount > 0 ? '█'.repeat(Math.max(1, Math.round(amount/maxVal*8))) : '░░'
    const marker = key === mk ? ' ◀ сейчас' : ''
    txt += `${label.padEnd(4)} ${bar} ${amount > 0 ? fmt(amount) : '—'}${marker}\n`
  }
  txt += `\n💰 <b>Год: ${fmt(total)}</b> · среднемесячно: ${fmt(total/12)}`
  await tgSend(token, chatId, txt)
}

async function cmdPortfolio(supabase: ReturnType<typeof createClient>, token: string, chatId: number, conn: { user_id: string; portfolio_id: string | null }) {
  let pid = conn.portfolio_id
  if (!pid) {
    const { data } = await supabase.from('portfolios').select('id').eq('user_id', conn.user_id).order('is_default', { ascending: false }).limit(1)
    pid = data?.[0]?.id
  }
  if (!pid) { await tgSend(token, chatId, '📭 Портфель не найден.'); return }

  const { data: pos } = await supabase.from('positions')
    .select('quantity, average_buy_price, instrument:instruments(ticker, short_name, name, last_price, price_change_percent)')
    .eq('portfolio_id', pid)
  if (!pos?.length) { await tgSend(token, chatId, '📭 Портфель пуст.'); return }

  let totalVal = 0, totalCost = 0
  let txt = '📊 <b>Портфель:</b>\n\n'
  for (const p of pos as { quantity: number; average_buy_price: number; instrument: { ticker: string; short_name?: string; name: string; last_price?: number; price_change_percent?: number } }[]) {
    const price = p.instrument.last_price || p.instrument.average_buy_price || p.average_buy_price
    const val = price * p.quantity
    const cost = p.average_buy_price * p.quantity
    const pnl = val - cost
    const pct = cost > 0 ? (pnl/cost*100).toFixed(1) : '0.0'
    totalVal += val; totalCost += cost
    const icon = pnl >= 0 ? '🟢' : '🔴'
    txt += `${icon} <b>${p.instrument.ticker}</b> · ${p.quantity} шт. · ${fmt(val)}\n   ${pnl>=0?'+':''}${pct}%\n\n`
  }
  const pnl = totalVal - totalCost
  txt += `💼 <b>Итого: ${fmt(totalVal)}</b>\n${pnl>=0?'🟢':'🔴'} P&L: ${pnl>=0?'+':''}${fmt(pnl)} (${(pnl/totalCost*100).toFixed(1)}%)`
  await tgSend(token, chatId, txt)
}

async function cmdAlerts(supabase: ReturnType<typeof createClient>, token: string, chatId: number, tgId: number) {
  const { data } = await supabase.from('telegram_connections').select('alerts_enabled, alert_days_before').eq('telegram_chat_id', tgId).single()
  const on = data?.alerts_enabled ?? true
  const days = data?.alert_days_before ?? 3
  await tgSend(token, chatId,
    `🔔 <b>Оповещения:</b> ${on ? '✅ включены' : '❌ выключены'}\nЗа ${days} ${days===1?'день':'дня'} до выплаты\n\n/alerts_on — включить\n/alerts_off — выключить\n/alerts_1 · /alerts_3 · /alerts_7 — срок`)
}

// ─── Entry point ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  try {
    const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!token) return new Response('no token', { status: 500 })

    const secret = req.headers.get('x-telegram-bot-api-secret-token')
    const expectedSecret = Deno.env.get('TELEGRAM_WEBHOOK_SECRET')
    if (expectedSecret && secret !== expectedSecret) return new Response('unauthorized', { status: 401 })

    const supabase = createClient(Deno.env.get('SUPABASE_URL')??'', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')??'')
    const update = await req.json()
    const msg = update?.message
    if (!msg?.text) return new Response('ok')

    const chatId: number = msg.chat.id
    const tgId: number = msg.from.id
    const cmd = msg.text.trim().split(' ')[0].replace(/@.+$/, '')

    if (cmd === '/start') { await cmdStart(supabase, token, chatId, tgId); return new Response('ok') }

    const { data: conn } = await supabase.from('telegram_connections').select('user_id, portfolio_id, alerts_enabled, alert_days_before').eq('telegram_chat_id', tgId).single()
    if (!conn) {
      await tgSend(token, chatId, `⚠️ Аккаунт не подключён.\nВаш ID: <code>${tgId}</code>\n\n/start — инструкция`)
      return new Response('ok')
    }

    switch (cmd) {
      case '/payments':   await cmdPayments(supabase, token, chatId, conn); break
      case '/month':      await cmdMonth(supabase, token, chatId, conn); break
      case '/forecast':   await cmdForecast(supabase, token, chatId, conn); break
      case '/portfolio':  await cmdPortfolio(supabase, token, chatId, conn); break
      case '/alerts':     await cmdAlerts(supabase, token, chatId, tgId); break
      case '/alerts_on':
        await supabase.from('telegram_connections').update({ alerts_enabled: true }).eq('telegram_chat_id', tgId)
        await tgSend(token, chatId, '✅ Оповещения включены.')
        break
      case '/alerts_off':
        await supabase.from('telegram_connections').update({ alerts_enabled: false }).eq('telegram_chat_id', tgId)
        await tgSend(token, chatId, '❌ Оповещения выключены.')
        break
      case '/alerts_1': case '/alerts_3': case '/alerts_7': {
        const d = parseInt(cmd.replace('/alerts_', ''))
        await supabase.from('telegram_connections').update({ alert_days_before: d }).eq('telegram_chat_id', tgId)
        await tgSend(token, chatId, `✅ Уведомляю за ${d} ${d===1?'день':'дня'} до выплаты.`)
        break
      }
      case '/help':
        await tgSend(token, chatId, `📋 <b>Команды:</b>\n\n${HELP}`)
        break
      default:
        await tgSend(token, chatId, `Неизвестная команда. /help — список команд.`)
    }
    return new Response('ok')
  } catch(e) {
    console.error(e)
    return new Response('error', { status: 500 })
  }
})
