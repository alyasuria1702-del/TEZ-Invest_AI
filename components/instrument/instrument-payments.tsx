'use client'

import { Calendar, Banknote } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Instrument } from '@/lib/types/database'
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils/format'

interface InstrumentPaymentsProps {
  instrument: Instrument
  coupons: { couponDate: string; recordDate: string; value: number }[]
}

export function InstrumentPayments({ instrument, coupons }: InstrumentPaymentsProps) {
  const now = new Date()
  
  // Show upcoming coupons (next 4)
  const upcomingCoupons = coupons
    .filter(c => new Date(c.couponDate) >= now)
    .slice(0, 4)
  
  // Show past coupons (last 2)
  const pastCoupons = coupons
    .filter(c => new Date(c.couponDate) < now)
    .slice(-2)
    .reverse()

  if (upcomingCoupons.length === 0 && pastCoupons.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Купонные выплаты
        </CardTitle>
        <CardDescription>
          Ближайшие и прошедшие выплаты
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {upcomingCoupons.map((coupon, index) => {
          const couponDate = new Date(coupon.couponDate)
          const isNext = index === 0
          
          return (
            <div 
              key={coupon.couponDate}
              className={`flex items-center justify-between rounded-lg p-3 ${
                isNext ? 'bg-primary/10' : 'bg-muted/50'
              }`}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatDate(couponDate)}</span>
                  {isNext && (
                    <Badge variant="default" className="text-xs">Следующий</Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRelativeDate(couponDate)}
                </span>
              </div>
              <div className="flex items-center gap-2 font-mono font-medium text-[var(--profit)]">
                <Banknote className="h-4 w-4" />
                {formatCurrency(coupon.value)}
              </div>
            </div>
          )
        })}
        
        {pastCoupons.length > 0 && (
          <>
            <div className="text-xs text-muted-foreground pt-2">Прошедшие выплаты</div>
            {pastCoupons.map((coupon) => (
              <div 
                key={coupon.couponDate}
                className="flex items-center justify-between rounded-lg bg-muted/30 p-3 opacity-70"
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{formatDate(coupon.couponDate)}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-muted-foreground">
                  <Banknote className="h-4 w-4" />
                  {formatCurrency(coupon.value)}
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  )
}
