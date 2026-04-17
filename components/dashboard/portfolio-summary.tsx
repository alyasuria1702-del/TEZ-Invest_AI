'use client'

import { TrendingUp, TrendingDown, Wallet, BarChart3, Coins, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { PositionWithInstrument } from '@/lib/types/database'
import { calculatePortfolioMetrics } from '@/lib/utils/portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface PortfolioSummaryProps {
  positions: PositionWithInstrument[]
}

export function PortfolioSummary({ positions }: PortfolioSummaryProps) {
  const metrics = calculatePortfolioMetrics(positions)
  const isProfit = metrics.totalProfitLoss >= 0

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

      {/* Total value — gold highlight */}
      <Card className="relative overflow-hidden border-border/60 bg-card/80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Стоимость портфеля
          </CardTitle>
          <Wallet className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight text-primary">
            {formatCurrency(metrics.totalValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {positions.length} позиций
          </p>
        </CardContent>
      </Card>

      {/* P&L */}
      <Card className="relative overflow-hidden border-border/60 bg-card/80">
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${isProfit ? 'via-[var(--profit)]/50' : 'via-[var(--loss)]/50'} to-transparent`} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Прибыль / Убыток
          </CardTitle>
          {isProfit
            ? <TrendingUp className="h-4 w-4 text-[var(--profit)]" />
            : <TrendingDown className="h-4 w-4 text-[var(--loss)]" />}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-semibold tracking-tight ${isProfit ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
            {isProfit ? '+' : ''}{formatCurrency(metrics.totalProfitLoss)}
          </div>
          <div className={`mt-1 flex items-center gap-1 text-xs ${isProfit ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
            {isProfit
              ? <ArrowUpRight className="h-3 w-3" />
              : <ArrowDownRight className="h-3 w-3" />}
            {isProfit ? '+' : ''}{formatPercent(metrics.totalProfitLossPercent)}
          </div>
        </CardContent>
      </Card>

      {/* Invested */}
      <Card className="relative overflow-hidden border-border/60 bg-card/80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Вложено
          </CardTitle>
          <Coins className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {formatCurrency(metrics.totalPurchaseValue)}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Сумма вложений</p>
        </CardContent>
      </Card>

      {/* Allocation */}
      <Card className="relative overflow-hidden border-border/60 bg-card/80">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Классы активов
          </CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-semibold tracking-tight">
            {metrics.assetAllocation.length}
          </div>
          <div className="mt-2 flex gap-1">
            {metrics.assetAllocation.map((a, i) => (
              <div
                key={a.type}
                className="h-1.5 rounded-full"
                style={{
                  width: `${a.percent}%`,
                  backgroundColor: `var(--chart-${i + 1})`,
                  opacity: 0.8,
                }}
                title={`${a.type}: ${a.percent.toFixed(1)}%`}
              />
            ))}
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
