'use client'

import Link from 'next/link'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PositionWithInstrument } from '@/lib/types/database'
import { calculatePortfolioMetrics } from '@/lib/utils/portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface PositionsTableProps {
  positions: PositionWithInstrument[]
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

export function PositionsTable({ positions }: PositionsTableProps) {
  const metrics = calculatePortfolioMetrics(positions)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Позиции</CardTitle>
        <CardDescription>
          Все инструменты в вашем портфеле
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Инструмент</TableHead>
              <TableHead>Тип</TableHead>
              <TableHead className="text-right">Кол-во</TableHead>
              <TableHead className="text-right">Цена покупки</TableHead>
              <TableHead className="text-right">Текущая цена</TableHead>
              <TableHead className="text-right">Стоимость</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">Доля</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.positions.map((posMetrics) => {
              const { position, currentValue, profitLoss, profitLossPercent, weight } = posMetrics
              const { instrument } = position
              const isProfit = profitLoss >= 0

              return (
                <TableRow key={position.id}>
                  <TableCell>
                    <Link 
                      href={`/instrument/${instrument.ticker}`}
                      className="flex flex-col hover:underline"
                    >
                      <span className="font-medium">{instrument.ticker}</span>
                      <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                        {instrument.short_name || instrument.name}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={typeColors[instrument.instrument_type]}>
                      {typeLabels[instrument.instrument_type]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {position.quantity}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(position.average_buy_price)}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {instrument.last_price ? formatCurrency(instrument.last_price) : '-'}
                  </TableCell>
                  <TableCell className="text-right font-mono font-medium">
                    {formatCurrency(currentValue)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`flex items-center justify-end gap-1 font-mono ${isProfit ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
                      {isProfit ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      <span>{isProfit ? '+' : ''}{formatPercent(profitLossPercent)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatPercent(weight)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
