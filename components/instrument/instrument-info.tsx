'use client'

import { ArrowUpRight, ArrowDownRight, Calendar, Percent, Banknote, Info } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Instrument } from '@/lib/types/database'
import { formatCurrency, formatPercent, formatDate } from '@/lib/utils/format'

interface InstrumentInfoProps {
  instrument: Instrument
}

const typeLabels = {
  bond: 'Облигация',
  stock: 'Акция',
  etf: 'Фонд',
}

const typeColors = {
  bond: 'bg-chart-2/20 text-chart-2',
  stock: 'bg-chart-1/20 text-chart-1',
  etf: 'bg-chart-3/20 text-chart-3',
}

export function InstrumentInfo({ instrument }: InstrumentInfoProps) {
  const priceChange = instrument.price_change_percent || 0
  const isPositive = priceChange >= 0

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">{instrument.ticker}</h1>
              <Badge variant="secondary" className={typeColors[instrument.instrument_type]}>
                {typeLabels[instrument.instrument_type]}
              </Badge>
            </div>
            <p className="text-muted-foreground">{instrument.name}</p>
            {instrument.isin && (
              <p className="text-xs text-muted-foreground">ISIN: {instrument.isin}</p>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1">
            <div className="text-3xl font-bold">
              {instrument.last_price ? formatCurrency(instrument.last_price) : '-'}
            </div>
            {instrument.last_price && (
              <div className={`flex items-center gap-1 ${isPositive ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
                {isPositive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                <span className="font-medium">
                  {isPositive ? '+' : ''}{formatPercent(priceChange)}
                </span>
                <span className="text-sm text-muted-foreground">за день</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Additional info for specific instrument types */}
        {instrument.instrument_type === 'bond' && (
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {instrument.face_value && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Номинал</p>
                  <p className="font-medium">{formatCurrency(instrument.face_value)}</p>
                </div>
              </div>
            )}
            {instrument.coupon_rate && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Percent className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Купон</p>
                  <p className="font-medium">{formatPercent(instrument.coupon_rate)}</p>
                </div>
              </div>
            )}
            {instrument.coupon_value && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Купон (руб.)</p>
                  <p className="font-medium">{formatCurrency(instrument.coupon_value)}</p>
                </div>
              </div>
            )}
            {instrument.maturity_date && (
              <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Погашение</p>
                  <p className="font-medium">{formatDate(instrument.maturity_date)}</p>
                </div>
              </div>
            )}
          </div>
        )}
        
        {instrument.lot_size > 1 && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Info className="h-4 w-4" />
            <span>Размер лота: {instrument.lot_size} шт.</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
