'use client'

import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Banknote, TrendingUp, Coins } from 'lucide-react'
import { usePortfolio } from '@/components/portfolio-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatShortDate } from '@/lib/utils/format'
import type { PaymentItem } from '@/app/api/payments/route'
import { cn } from '@/lib/utils'

const MONTHS_RU = ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь']
const DAYS_RU = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс']

export function PaymentsCalendar() {
  const { activePortfolio } = usePortfolio()
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    if (!activePortfolio) { setIsLoading(false); return }
    setIsLoading(true)
    fetch(`/api/payments?mode=calendar&portfolioId=${activePortfolio.id}`)
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setIsLoading(false))
  }, [activePortfolio?.id])

  // Group payments by date
  const paymentsByDate = useMemo(() => {
    const map: Record<string, PaymentItem[]> = {}
    for (const p of payments) {
      const key = p.date?.slice(0, 10)
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(p)
    }
    return map
  }, [payments])

  // Monthly totals for year overview
  const monthlyTotals = useMemo(() => {
    const totals: Record<string, number> = {}
    for (const p of payments) {
      if (p.status !== 'upcoming') continue
      const key = p.date?.slice(0, 7)
      if (!key) continue
      totals[key] = (totals[key] || 0) + p.totalAmount
    }
    return totals
  }, [payments])

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Build calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  // Mon=0 ... Sun=6
  const startDow = (firstDay.getDay() + 6) % 7
  const totalCells = Math.ceil((startDow + lastDay.getDate()) / 7) * 7
  const cells: (number | null)[] = Array(totalCells).fill(null)
  for (let d = 1; d <= lastDay.getDate(); d++) cells[startDow + d - 1] = d

  const todayStr = new Date().toISOString().slice(0, 10)
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`
  const monthTotal = monthlyTotals[monthKey] || 0

  const selectedPayments = selectedDay ? (paymentsByDate[selectedDay] || []) : []

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))

  // Year overview: 12 months from today
  const now = new Date()
  const yearMonths = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { label: MONTHS_RU[d.getMonth()].slice(0, 3), key: k, year: d.getFullYear(), amount: monthlyTotals[k] || 0 }
  })
  const maxMonthAmount = Math.max(...yearMonths.map(m => m.amount), 1)

  return (
    <div className="space-y-6">
      {/* Year bar chart overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Ожидаемые выплаты — следующие 12 месяцев</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="flex items-end gap-1.5 h-24">
              {yearMonths.map((m) => {
                const height = m.amount > 0 ? Math.max(8, Math.round((m.amount / maxMonthAmount) * 80)) : 4
                const isActive = m.key === monthKey
                return (
                  <div
                    key={m.key}
                    className="flex flex-1 flex-col items-center gap-1 cursor-pointer group"
                    onClick={() => setCurrentDate(new Date(m.year, parseInt(m.key.slice(5, 7)) - 1, 1))}
                  >
                    <span className="text-[10px] text-muted-foreground font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {m.amount > 0 ? formatCurrency(m.amount) : ''}
                    </span>
                    <div
                      className={cn(
                        'w-full rounded-sm transition-all',
                        isActive ? 'bg-primary' : m.amount > 0 ? 'bg-primary/40 group-hover:bg-primary/70' : 'bg-muted/40'
                      )}
                      style={{ height: `${height}px` }}
                    />
                    <span className={cn('text-[10px]', isActive ? 'text-primary font-medium' : 'text-muted-foreground')}>
                      {m.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Calendar */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <button onClick={prevMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-medium text-sm">{MONTHS_RU[month]} {year}</p>
                  {monthTotal > 0 && (
                    <p className="text-xs text-primary font-mono">+{formatCurrency(monthTotal)}</p>
                  )}
                </div>
                <button onClick={nextMonth} className="p-1.5 rounded-md hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Day headers */}
              <div className="grid grid-cols-7 mb-1">
                {DAYS_RU.map(d => (
                  <div key={d} className="text-center text-[11px] text-muted-foreground font-medium py-1">{d}</div>
                ))}
              </div>
              {/* Cells */}
              <div className="grid grid-cols-7 gap-0.5">
                {isLoading
                  ? Array(35).fill(0).map((_, i) => <Skeleton key={i} className="h-12 rounded" />)
                  : cells.map((day, i) => {
                    if (!day) return <div key={i} />
                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                    const dayPayments = paymentsByDate[dateStr] || []
                    const isToday = dateStr === todayStr
                    const isSelected = dateStr === selectedDay
                    const dayTotal = dayPayments.reduce((s, p) => s + p.totalAmount, 0)
                    const hasCoupon = dayPayments.some(p => p.paymentType === 'coupon')
                    const hasDividend = dayPayments.some(p => p.paymentType === 'dividend')

                    return (
                      <button
                        key={i}
                        onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                        className={cn(
                          'relative flex flex-col items-center justify-start p-1 rounded-lg min-h-[52px] text-xs transition-all',
                          isSelected ? 'bg-primary/15 ring-1 ring-primary' : 'hover:bg-muted/60',
                          isToday ? 'ring-1 ring-primary/50' : '',
                          dayPayments.length > 0 ? 'cursor-pointer' : 'cursor-default'
                        )}
                      >
                        <span className={cn(
                          'text-[11px] font-medium w-5 h-5 flex items-center justify-center rounded-full',
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground'
                        )}>
                          {day}
                        </span>
                        {dayPayments.length > 0 && (
                          <div className="flex flex-col items-center gap-0.5 mt-0.5 w-full">
                            <div className="flex gap-0.5 justify-center">
                              {hasCoupon && <span className="w-1.5 h-1.5 rounded-full bg-chart-2" />}
                              {hasDividend && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
                            </div>
                            <span className="text-[9px] font-mono text-primary leading-none">
                              {formatCurrency(dayTotal)}
                            </span>
                          </div>
                        )}
                      </button>
                    )
                  })
                }
              </div>
              {/* Legend */}
              <div className="flex gap-4 mt-3 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-chart-2" />
                  Купон
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  Дивиденд
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Day detail / month list */}
        <div className="space-y-4">
          {/* Selected day payments */}
          {selectedDay && selectedPayments.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{formatShortDate(selectedDay)}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {selectedPayments.map((p, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 py-1.5 border-b border-border/50 last:border-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-medium text-foreground">{p.ticker}</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1">
                          {p.paymentType === 'coupon' ? 'Купон' : 'Дивиденд'}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">{p.instrumentName}</p>
                      <p className="text-[11px] text-muted-foreground">{formatCurrency(p.amountPerUnit)} / шт.</p>
                    </div>
                    <span className="font-mono text-sm font-medium text-primary whitespace-nowrap">
                      +{formatCurrency(p.totalAmount)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* All payments this month */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Этот месяц</CardTitle>
                {monthTotal > 0 && (
                  <span className="text-sm font-mono font-medium text-primary">+{formatCurrency(monthTotal)}</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10" />)}</div>
              ) : (
                <div className="space-y-1">
                  {Object.entries(paymentsByDate)
                    .filter(([date]) => date.startsWith(monthKey))
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, ps]) => {
                      const total = ps.reduce((s, p) => s + p.totalAmount, 0)
                      return (
                        <button
                          key={date}
                          onClick={() => setSelectedDay(date === selectedDay ? null : date)}
                          className={cn(
                            'w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-md text-left transition-colors text-xs',
                            date === selectedDay ? 'bg-primary/10 text-primary' : 'hover:bg-muted/60 text-foreground'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                            <span>{formatShortDate(date)}</span>
                            <div className="flex gap-1">
                              {ps.some(p => p.paymentType === 'coupon') && <span className="w-1.5 h-1.5 rounded-full bg-chart-2 mt-0.5" />}
                              {ps.some(p => p.paymentType === 'dividend') && <span className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
                            </div>
                          </div>
                          <span className="font-mono font-medium text-primary">+{formatCurrency(total)}</span>
                        </button>
                      )
                    })
                  }
                  {!Object.keys(paymentsByDate).some(d => d.startsWith(monthKey)) && (
                    <p className="text-sm text-muted-foreground text-center py-4">Выплат нет</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
