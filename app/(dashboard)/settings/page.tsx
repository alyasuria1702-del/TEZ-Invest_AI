import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { TelegramSettings } from '@/components/settings/telegram-settings'
import { createClient } from '@/lib/supabase/server'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tgConn } = await supabase
    .from('telegram_connections')
    .select('telegram_chat_id, alerts_enabled, alert_days_before')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen flex-col w-full">
      <DashboardHeader title="Настройки" />
      <div className="flex-1 w-full p-4 md:p-6">
        <div className="w-full max-w-2xl mx-auto">
          <TelegramSettings
            initialChatId={tgConn?.telegram_chat_id ?? null}
            initialAlertsEnabled={tgConn?.alerts_enabled ?? true}
            initialAlertDays={tgConn?.alert_days_before ?? 3}
          />
        </div>
      </div>
    </div>
  )
}
