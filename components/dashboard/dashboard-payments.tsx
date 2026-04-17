'use client'

import { useEffect, useState } from 'react'
import { Calendar, Banknote, TrendingUp, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import type { PaymentItem } from '@/app/api/payments/route'

interface DashboardPaymentsProps {
  portfolioId?: string
}

export function DashboardPayments({ portfolioId }: DashboardPaymentsProps) {
  const [payments, setPayments] = useState<PaymentItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const url = portfolioId ? `/api/payments?portfolioId=${portfolioId}` : '/api/payments'
    fetch(url)
      .then(res => res.json())
      .then(data => setPayments(data.payments || []))
      .catch(() => setPayments([]))
      .finally(() => setIsLoading(false))
  }, [portfolioId])

  const upcoming = payments.filter(p => p.status === 'upcoming')
  const past = payments.filter(p => p.status === 'past').slice(0, 5)

  const totalUpcoming = upcoming.reduce((s, p) => s + p.totalAmount, 0)
  const totalPast = past.reduce((s, p) => s + p.totalAmount, 0)

  if (!isLoading && payments.length === 0) return null

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Купоны и дивиденды</CardTitle>
          </div>
          {!isLoading && upcoming.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Ожидается</p>
              <p className="font-bold text-[var(--profit)]">{formatCurrency(totalUpcoming)}</p>
            </div>
          )}
        </div>
        <CardDescription>Предстоящие и прошедшие выплаты по портфелю</CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
          ))
        ) : (
          <>
            {upcoming.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pb-1">
                  Предстоящие
                </p>
                {upcoming.slice(0, 5).map((p, i) => (
                  <PaymentRow key={`up-${i}`} payment={p} />
                ))}
              </>
            )}

            {past.length > 0 && (
              <>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider pt-3 pb-1">
                  Прошедшие (последние {past.length})
                </p>
                {past.map((p, i) => (
                  <PaymentRow key={`past-${i}`} payment={p} dimmed />
                ))}
                {past.length > 0 && (
                  <div className="flex justify-between items-center pt-1 text-sm text-muted-foreground border-t">
                    <span>Итого получено</span>
                    <span className="font-mono font-medium">{formatCurrency(totalPast)}</span>
                  </div>
                )}
              </>
            )}

            {upcoming.length === 0 && past.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Нет данных о выплатах по инструментам портфеля
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function PaymentRow({ payment, dimmed = false }: { payment: PaymentItem; dimmed?: boolean }) {
  const date = new Date(payment.date)
  const now = new Date()
  const diffDays = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

  const daysLabel = payment.status === 'upcoming'
    ? diffDays === 0 ? 'Сегодня'
      : diffDays === 1 ? 'Завтра'
      : diffDays > 0 ? `Через ${diffDays} дн.`
      : `${Math.abs(diffDays)} дн. назад`
    : formatDate(payment.date)

  return (
    <div className={`flex items-center justify-between rounded-lg p-3 transition-colors ${
      dimmed ? 'bg-muted/30 opacity-70' : 'bg-muted/50 hover:bg-muted/80'
    }`}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          payment.paymentType === 'coupon'
            ? 'bg-chart-2/20 text-chart-2'
            : 'bg-chart-1/20 text-chart-1'
        }`}>
          {payment.paymentType === 'coupon' ? (
            <Calendar className="h-4 w-4" />
          ) : (
            <TrendingUp className="h-4 w-4" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono font-medium text-sm">{payment.ticker}</span>
            <Badge variant="secondary" className="text-xs h-5">
              {payment.paymentType === 'coupon' ? 'Купон' : 'Дивиденд'}
            </Badge>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            <Clock className="h-3 w-3" />
            <span>{daysLabel}</span>
            <span>·</span>
            <span>{formatCurrency(payment.amountPerUnit)} / шт.</span>
          </div>
        </div>
      </div>

      <div className={`font-mono font-medium text-sm shrink-0 ${
        payment.status === 'upcoming' ? 'text-[var(--profit)]' : 'text-muted-foreground'
      }`}>
        {payment.status === 'upcoming' ? '+' : ''}{formatCurrency(payment.totalAmount)}
      </div>
    </div>
  )
}
