import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/profile/telegram — connect Telegram
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { chatId, portfolioId } = await req.json()
  if (!chatId || isNaN(Number(chatId))) {
    return NextResponse.json({ error: 'Некорректный Chat ID' }, { status: 400 })
  }

  const { error } = await supabase
    .from('telegram_connections')
    .upsert({
      user_id: user.id,
      telegram_chat_id: Number(chatId),
      portfolio_id: portfolioId || null,
      alerts_enabled: true,
      alert_days_before: 3,
    }, { onConflict: 'user_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE /api/profile/telegram — disconnect
export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await supabase.from('telegram_connections').delete().eq('user_id', user.id)
  return NextResponse.json({ ok: true })
}

// PATCH /api/profile/telegram — update alert settings
export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (typeof body.alertsEnabled === 'boolean') updates.alerts_enabled = body.alertsEnabled
  if (typeof body.alertDaysBefore === 'number') updates.alert_days_before = body.alertDaysBefore

  const { error } = await supabase
    .from('telegram_connections')
    .update(updates)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
