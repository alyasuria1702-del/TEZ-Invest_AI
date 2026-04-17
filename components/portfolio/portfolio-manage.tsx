'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, FileUp, Trash2, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import type { Portfolio, PositionWithInstrument } from '@/lib/types/database'
import { calculatePortfolioMetrics } from '@/lib/utils/portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface PortfolioManageProps {
  portfolio: Portfolio
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

export function PortfolioManage({ portfolio, positions }: PortfolioManageProps) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const metrics = calculatePortfolioMetrics(positions)

  const handleDelete = async (positionId: string) => {
    setDeletingId(positionId)
    try {
      const res = await fetch('/api/positions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positionId }),
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{portfolio.name}</h2>
          <p className="text-muted-foreground">{positions.length} позиций</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/portfolio/import">
              <FileUp className="mr-2 h-4 w-4" />
              Импорт CSV
            </Link>
          </Button>
          <Button asChild>
            <Link href="/portfolio/add">
              <Plus className="mr-2 h-4 w-4" />
              Добавить
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Стоимость портфеля</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.totalValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Вложено</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(metrics.totalPurchaseValue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Прибыль / Убыток</p>
            <div className={`flex items-center gap-1 mt-1 ${metrics.totalProfitLoss >= 0 ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
              {metrics.totalProfitLoss >= 0 ? (
                <ArrowUpRight className="h-5 w-5" />
              ) : (
                <ArrowDownRight className="h-5 w-5" />
              )}
              <span className="text-2xl font-bold">
                {metrics.totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(metrics.totalProfitLoss)}
              </span>
              <span className="text-sm">
                ({metrics.totalProfitLossPercent >= 0 ? '+' : ''}{formatPercent(metrics.totalProfitLossPercent)})
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions table with management */}
      <Card>
        <CardHeader>
          <CardTitle>Позиции</CardTitle>
          <CardDescription>Управление инструментами в портфеле</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Инструмент</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead className="text-right">Кол-во</TableHead>
                <TableHead className="text-right">Ср. цена</TableHead>
                <TableHead className="text-right">Текущая</TableHead>
                <TableHead className="text-right">P&L</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {metrics.positions.map(({ position, profitLoss, profitLossPercent }) => {
                const { instrument } = position
                const isProfit = profitLoss >= 0

                return (
                  <TableRow key={position.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{instrument.ticker}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                          {instrument.short_name || instrument.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={typeColors[instrument.instrument_type]}>
                        {typeLabels[instrument.instrument_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">{position.quantity}</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(position.average_buy_price)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {instrument.last_price ? formatCurrency(instrument.last_price) : '—'}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={`font-mono text-sm ${isProfit ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}`}>
                        {isProfit ? '+' : ''}{formatPercent(profitLossPercent)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                          <Link href={`/instrument/${instrument.ticker}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={deletingId === position.id}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить позицию?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Позиция {instrument.ticker} будет удалена из портфеля.
                                Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(position.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
