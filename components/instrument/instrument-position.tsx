'use client'

import Link from 'next/link'
import { Plus, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Instrument, PositionWithInstrument } from '@/lib/types/database'
import { calculatePositionMetrics } from '@/lib/utils/portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface InstrumentPositionProps {
  instrument: Instrument
  position: PositionWithInstrument | null
}

export function InstrumentPosition({ instrument, position }: InstrumentPositionProps) {
  if (!position) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Ваша позиция
          </CardTitle>
          <CardDescription>
            У вас нет этого инструмента
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full">
            <Link href={`/portfolio/add?ticker=${instrument.ticker}`}>
              <Plus className="mr-2 h-4 w-4" />
              Добавить в портфель
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const metrics = calculatePositionMetrics(position, position.quantity * (instrument.last_price || position.average_buy_price))
  const isProfit = metrics.profitLoss >= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Ваша позиция
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Количество</span>
          <span className="font-mono font-medium">{position.quantity} шт.</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Средняя цена</span>
          <span className="font-mono">{formatCurrency(position.average_buy_price)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground">Инвестировано</span>
          <span className="font-mono">{formatCurrency(metrics.purchaseValue)}</span>
        </div>
        
        <div className="border-t pt-4">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Текущая стоимость</span>
            <span className="font-mono font-bold text-lg">{formatCurrency(metrics.currentValue)}</span>
          </div>
          
          <div className="flex justify-between items-center mt-2">
            <span className="text-muted-foreground">Прибыль/Убыток</span>
            <div className={`flex items-center gap-1 ${isProfit ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
              {isProfit ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span className="font-mono font-medium">
                {isProfit ? '+' : ''}{formatCurrency(metrics.profitLoss)}
              </span>
              <span className="text-sm">
                ({isProfit ? '+' : ''}{formatPercent(metrics.profitLossPercent)})
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
