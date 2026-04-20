'use client'

import { useEffect, useState, useMemo } from 'react'
import { TrendingUp, Coins } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/utils/format'
import type { PaymentItem } from '@/app/api/payments/route'

interface IncomeForecastProps {
  portfolioId?: string
}

const MONTHS_SHORT = ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек']

export function IncomeForecast({ portfolioId }: IncomeForecastProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!portfolioId) { setIsLoading(false); return }
    setIsLoading(true)
    const url = `/api/payments?mode=forecast&portfolioId=${portfolioId}`
    fetch(url)
      .then(r => r.json())
      .then(d => setPayments(d.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setIsLoading(false))
  }, [portfolioId])

  const chartData = useMemo(() => {
    const now = new Date()
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const isPast = i === 0 && now.getDate() > 15 ? false : i < 0
      return {
        key,
        label: MONTHS_SHORT[d.getMonth()],
        isCurrent: i === 0,
        coupons: 0,
        dividends: 0,
        total: 0,
      }
    })

    for (const p of payments) {
      if (p.status !== 'upcoming') continue
      const key = p.date?.slice(0, 7)
      const entry = months.find(m => m.key === key)
      if (!entry) continue
      if (p.paymentType === 'coupon') entry.coupons += p.totalAmount
      else entry.dividends += p.totalAmount
      entry.total += p.totalAmount
    }
    return months
  }, [payments])

  const totalForecast = chartData.reduce((s, m) => s + m.total, 0)
  const avgMonthly = totalForecast / 12
  const nextPaymentMonth = chartData.find(m => m.total > 0)

  if (!isLoading && payments.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Прогноз пассивного дохода</CardTitle>
          </div>
          {!isLoading && totalForecast > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">За 12 месяцев</p>
              <p className="font-bold text-primary font-mono">{formatCurrency(totalForecast)}</p>
            </div>
          )}
        </div>
        <CardDescription>
          {avgMonthly > 0
            ? `Среднемесячный доход от выплат: ${formatCurrency(avgMonthly)}`
            : 'Прогноз купонов и дивидендов на год вперёд'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barSize={20}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                  />
                  <Tooltip
                    cursor={{ fill: 'var(--muted)', opacity: 0.3 }}
                    contentStyle={{
                      background: 'var(--card)',
                      border: '0.5px solid var(--border)',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                    formatter={(value: number, name: string) => [
                      formatCurrency(value),
                      name === 'coupons' ? 'Купоны' : 'Дивиденды'
                    ]}
                    labelStyle={{ color: 'var(--foreground)', fontWeight: 500, marginBottom: 4 }}
                  />
                  <Bar dataKey="coupons" stackId="a" fill="var(--chart-2)" radius={[0,0,0,0]} />
                  <Bar dataKey="dividends" stackId="a" fill="var(--primary)" radius={[3,3,0,0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.isCurrent ? 'var(--primary)' : 'var(--primary)'}
                        fillOpacity={entry.total === 0 ? 0.2 : 1}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend + summary */}
            <div className="flex flex-wrap items-center justify-between gap-4 mt-3 pt-3 border-t border-border/50">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--chart-2)' }} />
                  Купоны
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--primary)' }} />
                  Дивиденды
                </div>
              </div>
              {nextPaymentMonth && nextPaymentMonth.total > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <TrendingUp className="h-3.5 w-3.5 text-primary" />
                  <span className="text-muted-foreground">Ближайший месяц:</span>
                  <span className="font-mono font-medium text-primary">
                    +{formatCurrency(nextPaymentMonth.total)}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
