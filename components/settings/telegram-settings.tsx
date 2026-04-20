'use client'

import { useState } from 'react'
import {
  MessageSquare, Check, Unlink, ExternalLink,
  Loader2, Info, Bell, BellOff,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

const BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'TezInvestAIBot'

const COMMANDS = [
  { cmd: '/payments', desc: 'Ближайшие выплаты' },
  { cmd: '/month',    desc: 'Выплаты этого месяца' },
  { cmd: '/forecast', desc: 'Прогноз на 12 месяцев' },
  { cmd: '/portfolio',desc: 'Состав портфеля и P&L' },
  { cmd: '/alerts',   desc: 'Настройки оповещений' },
  { cmd: '/help',     desc: 'Все команды' },
]

const DAYS_OPTIONS = [
  { value: 1,  label: 'За 1 день' },
  { value: 3,  label: 'За 3 дня' },
  { value: 7,  label: 'За 7 дней' },
  { value: 14, label: 'За 2 недели' },
]

interface TelegramSettingsProps {
  initialChatId: number | null
  initialAlertsEnabled: boolean
  initialAlertDays: number
}

export function TelegramSettings({
  initialChatId,
  initialAlertsEnabled,
  initialAlertDays,
}: TelegramSettingsProps) {
  const [chatId, setChatId]               = useState<number | null>(initialChatId)
  const [alertsEnabled, setAlertsEnabled] = useState(initialAlertsEnabled)
  const [alertDays, setAlertDays]         = useState(initialAlertDays)
  const [inputValue, setInputValue]       = useState('')
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState('')
  const [success, setSuccess]             = useState('')

  const handleConnect = async () => {
    const id = parseInt(inputValue.trim())
    if (isNaN(id)) { setError('Введите числовой Chat ID'); return }
    setIsLoading(true); setError(''); setSuccess('')
    try {
      const res = await fetch('/api/profile/telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: id }),
      })
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Ошибка'); return }
      setChatId(id); setInputValue('')
      setSuccess('Telegram успешно подключён! Напишите боту /start')
    } catch { setError('Ошибка сети') }
    finally { setIsLoading(false) }
  }

  const handleDisconnect = async () => {
    if (!confirm('Отключить Telegram?')) return
    setIsLoading(true); setError(''); setSuccess('')
    try {
      await fetch('/api/profile/telegram', { method: 'DELETE' })
      setChatId(null); setSuccess('Telegram отключён.')
    } catch { setError('Ошибка сети') }
    finally { setIsLoading(false) }
  }

  const handleToggleAlerts = async () => {
    const newVal = !alertsEnabled
    setAlertsEnabled(newVal)
    await fetch('/api/profile/telegram', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertsEnabled: newVal }),
    })
  }

  const handleDaysChange = async (days: number) => {
    setAlertDays(days)
    await fetch('/api/profile/telegram', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertDaysBefore: days }),
    })
  }

  return (
    <div className="space-y-4 w-full">

      {/* ── Основная карточка ── */}
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0" />
              <CardTitle>Telegram-бот</CardTitle>
            </div>
            {chatId && (
              <Badge variant="secondary" className="text-xs shrink-0 bg-[var(--profit)]/15 text-[var(--profit)]">
                <Check className="mr-1 h-3 w-3" />Подключён
              </Badge>
            )}
          </div>
          <CardDescription>
            Получайте данные о выплатах и алерты прямо в Telegram
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4 w-full">
          {chatId ? (
            /* ── Подключён ── */
            <>
              <div className="rounded-lg border border-[var(--profit)]/20 bg-[var(--profit)]/5 px-4 py-3">
                <p className="text-sm font-medium text-[var(--profit)] mb-1">
                  Подключён
                </p>
                <p className="text-xs text-muted-foreground">
                  Chat ID: <code className="font-mono">{chatId}</code>
                </p>
              </div>

              <div>
                <p className="text-sm font-medium mb-2">Команды бота</p>
                <div className="rounded-lg border border-border/50 overflow-hidden">
                  {COMMANDS.map(({ cmd, desc }) => (
                    <div key={cmd} className="flex items-center gap-3 px-3 py-2 border-b border-border/50 last:border-0">
                      <code className="text-xs font-mono text-primary shrink-0 w-24">{cmd}</code>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Открыть бота
                  </a>
                </Button>
                <Button
                  variant="ghost" size="sm"
                  onClick={handleDisconnect}
                  disabled={isLoading}
                  className="text-destructive hover:text-destructive"
                >
                  {isLoading
                    ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    : <Unlink className="mr-2 h-3.5 w-3.5" />
                  }
                  Отключить
                </Button>
              </div>
            </>
          ) : (
            /* ── Не подключён ── */
            <>
              {/* Шаг 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    1
                  </span>
                  <p className="text-sm font-medium">Откройте бота и нажмите Start</p>
                </div>
                <div className="pl-9 space-y-1.5">
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                    <a href={`https://t.me/${BOT_USERNAME}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      @{BOT_USERNAME}
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Бот пришлёт ваш Chat ID в ответ на /start
                  </p>
                </div>
              </div>

              {/* Шаг 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                    2
                  </span>
                  <Label htmlFor="chat-id" className="text-sm font-medium">
                    Вставьте Chat ID
                  </Label>
                </div>
                <div className="pl-9 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="chat-id"
                      placeholder="123456789"
                      value={inputValue}
                      onChange={e => setInputValue(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleConnect()}
                      className="font-mono w-40"
                    />
                    <Button
                      onClick={handleConnect}
                      disabled={!inputValue.trim() || isLoading}
                    >
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Подключить
                    </Button>
                  </div>
                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}
                </div>
              </div>
            </>
          )}

          {success && (
            <p className="text-sm text-[var(--profit)] flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0" />
              {success}
            </p>
          )}

          <div className="flex gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>Бот работает в режиме только чтения. Никаких сделок совершать не может.</span>
          </div>
        </CardContent>
      </Card>

      {/* ── Карточка оповещений ── */}
      {chatId && (
        <Card className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {alertsEnabled
                  ? <Bell className="h-5 w-5 text-muted-foreground shrink-0" />
                  : <BellOff className="h-5 w-5 text-muted-foreground shrink-0" />
                }
                <CardTitle>Оповещения</CardTitle>
              </div>
              <button
                onClick={handleToggleAlerts}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                  alertsEnabled ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                    alertsEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <CardDescription>
              {alertsEnabled
                ? 'Ежедневные уведомления о выплатах и изменениях цен'
                : 'Оповещения выключены'
              }
            </CardDescription>
          </CardHeader>

          {alertsEnabled && (
            <CardContent>
              <div className="space-y-3">
                <Label className="text-sm">Уведомлять о выплатах</Label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleDaysChange(opt.value)}
                      className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                        alertDays === opt.value
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Также отправляем алерт при изменении цены более чем на 3%
                </p>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  )
}
