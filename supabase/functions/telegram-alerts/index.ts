// Supabase Edge Function: telegram-alerts
// Sends daily payment alerts via Telegram
// Triggered by pg_cron at 09:00 Moscow (06:00 UTC)
//
// Setup pg_cron after deploying:
// SELECT cron.schedule('tg-alerts', '0 6 * * *', $$
//   SELECT net.http_post(
//     url := 'https://YOUR_PROJECT.supabase.co/functions/v1/telegram-alerts',
//     headers := '{"Authorization":"Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
//     body := '{}'::jsonb
//   );
// $$);

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TG = (t: string) => `https://api.telegram.org/bot${t}`
const MOEX = 'https://iss.moex.com/iss'

function fmt(n: number, cur = 'RUB') {
  if (cur === 'RUB') return `${Math.round(n).toLocaleString('ru-RU')} ₽`
  if (cur === 'USD') return `$${n.toFixed(2)}`
  return `${n.toFixed(2)} ${cur}`
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

async function tgSend(token: string, chatId: number, text: string) {
  await fetch(`${TG(token)}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  })
}

async function getCoupons(ticker: string): Promise<{ date: string; value: number }[]> {
  try {
    const r = await fetch(`${MOEX}/securities/${ticker}/bondization.json?iss.meta=off&limit=100`)
    const j = await r.json()
    const cols: string[] = j.coupons?.columns ?? []
    const rows: unknown[][] = j.coupons?.data ?? []
    const di = cols.indexOf('coupondate'), vi = cols.indexOf('value')
    return rows.map(row => ({ date: String(row[di]), value: Number(row[vi]) || 0 })).filter(c => c.value > 0)
  } catch { return [] }
}

async function getDividends(ticker: string): Promise<{ date: string; value: number; currency: string }[]> {
  try {
    const r = await fetch(`${MOEX}/securities/${ticker}/dividends.json?iss.meta=off`)
    const j = await r.json()
    const cols: string[] = j.dividends?.columns ?? []
    const rows: unknown[][] = j.dividends?.data ?? []
    const di = cols.indexOf('registryclosedate'), vi = cols.indexOf('value'), ci = cols.indexOf('currencyid')
    return rows.map(row => ({ date: String(row[di]), value: Number(row[vi])||0, currency: String(row[ci]||'RUB') })).filter(d=>d.value>0)
  } catch { return [] }
}

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  if (req.headers.get('Authorization') !== `Bearer ${serviceKey}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!token) return new Response('No token', { status: 500 })

  const supabase = createClient(Deno.env.get('SUPABASE_URL')??'', serviceKey)

  const { data: connections } = await supabase
    .from('telegram_connections')
    .select('telegram_chat_id, user_id, portfolio_id, alert_days_before')
    .eq('alerts_enabled', true)

  if (!connections?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })

  const now = new Date(); now.setHours(0,0,0,0)
  let sent = 0

  for (const conn of connections) {
    try {
      let pid = conn.portfolio_id
      if (!pid) {
        const { data } = await supabase.from('portfolios').select('id').eq('user_id', conn.user_id).order('is_default', { ascending: false }).limit(1)
        pid = data?.[0]?.id
      }
      if (!pid) continue

      const { data: positions } = await supabase.from('positions')
        .select('quantity, instrument:instruments(ticker, short_name, name, instrument_type, currency, last_price, price_change_percent)')
        .eq('portfolio_id', pid)
      if (!positions?.length) continue

      const alerts: string[] = []
      const daysBefore = conn.alert_days_before ?? 3

      for (const pos of positions as { quantity: number; instrument: { ticker: string; short_name?: string; name: string; instrument_type: string; currency?: string; last_price?: number; price_change_percent?: number } }[]) {
        const inst = pos.instrument

        // Price alerts
        const chg = inst.price_change_percent ?? 0
        if (Math.abs(chg) >= 3 && inst.last_price) {
          const icon = chg > 0 ? '🟢' : '🔴'
          alerts.push(`${icon} <b>${inst.ticker}</b>: ${chg>0?'+':''}${chg.toFixed(1)}% · ${fmt(inst.last_price, inst.currency||'RUB')}`)
        }

        // Payment alerts
        if (inst.instrument_type === 'bond') {
          const coupons = await getCoupons(inst.ticker)
          for (const c of coupons) {
            const d = new Date(c.date); d.setHours(0,0,0,0)
            const diff = Math.round((d.getTime()-now.getTime())/86400000)
            if (diff === daysBefore || diff === 1 || diff === 0) {
              const when = diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : `через ${diff} дн.`
              alerts.push(`📎 <b>${inst.ticker}</b> купон ${when}\n   ${fmtDate(c.date)} · ${fmt(c.value * pos.quantity, inst.currency||'RUB')}`)
            }
          }
        }

        if (inst.instrument_type === 'stock') {
          const divs = await getDividends(inst.ticker)
          for (const dv of divs) {
            const d = new Date(dv.date); d.setHours(0,0,0,0)
            const diff = Math.round((d.getTime()-now.getTime())/86400000)
            if (diff === daysBefore || diff === 1 || diff === 0) {
              const when = diff === 0 ? 'сегодня' : diff === 1 ? 'завтра' : `через ${diff} дн.`
              alerts.push(`💵 <b>${inst.ticker}</b> дивиденд ${when}\n   ${fmtDate(dv.date)} · ${fmt(dv.value * pos.quantity, dv.currency)}`)
            }
          }
        }
      }

      if (alerts.length > 0) {
        const text = `📬 <b>Алерты Tez Invest AI:</b>\n\n${alerts.join('\n\n')}\n\n<a href="https://tez-invest-ai.vercel.app">Открыть портфель →</a>`
        await tgSend(token, conn.telegram_chat_id, text)
        sent++
      }
    } catch(e) {
      console.error('Alert error for', conn.telegram_chat_id, e)
    }
  }

  return new Response(JSON.stringify({ sent, total: connections.length }), { headers: { 'Content-Type': 'application/json' } })
})
