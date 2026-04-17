'use client'

import { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import type { PositionWithInstrument } from '@/lib/types/database'
import { formatCurrency } from '@/lib/utils/format'

interface PortfolioValueChartProps {
  positions: PositionWithInstrument[]
  portfolioId?: string
}

const PERIODS = [
  { label: '7Д', days: 7 },
  { label: '1М', days: 30 },
  { label: '3М', days: 90 },
  { label: '6М', days: 180 },
]

interface ChartPoint {
  date: string
  value: number
  label: string
}

export function PortfolioValueChart({ positions, portfolioId }: PortfolioValueChartProps) {
  const [chartData, setChartData] = useState<ChartPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activePeriod, setActivePeriod] = useState(30)

  useEffect(() => {
    if (!positions.length) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    const url = portfolioId
      ? `/api/portfolio-history?days=${activePeriod}&portfolioId=${portfolioId}`
      : `/api/portfolio-history?days=${activePeriod}`
    fetch(url)
      .then(res => res.json())
      .then(data => setChartData(data.chartData || []))
      .catch(() => setChartData([]))
      .finally(() => setIsLoading(false))
  }, [activePeriod, positions.length])

  const firstValue = chartData[0]?.value || 0
  const lastValue = chartData[chartData.length - 1]?.value || 0
  const change = lastValue - firstValue
  const isPositive = change >= 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle>Динамика стоимости</CardTitle>
            <CardDescription className="mt-1">
              {!isLoading && chartData.length > 0 && (
                <span className={isPositive ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}>
                  {isPositive ? '+' : ''}{formatCurrency(change)} за период
                </span>
              )}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {PERIODS.map(p => (
              <Button
                key={p.days}
                variant={activePeriod === p.days ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setActivePeriod(p.days)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          {isLoading ? (
            <div className="flex items-end gap-1 h-full pb-2">
              {Array.from({ length: 22 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="flex-1 rounded-sm"
                  style={{ height: `${35 + Math.abs(Math.sin(i / 2.5)) * 45}%` }}
                />
              ))}
            </div>
          ) : chartData.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              Недостаточно данных для построения графика
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="portfolioGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop
                      offset="5%"
                      stopColor={isPositive ? 'var(--chart-1)' : 'var(--destructive)'}
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="95%"
                      stopColor={isPositive ? 'var(--chart-1)' : 'var(--destructive)'}
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                  tickFormatter={v => `${(v / 1000).toFixed(0)}K`}
                  width={45}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      const point = payload[0].payload as ChartPoint
                      const val = payload[0].value as number
                      const diff = val - firstValue
                      const diffPct = firstValue > 0 ? (diff / firstValue) * 100 : 0
                      return (
                        <div className="rounded-lg border bg-background p-3 shadow-sm text-sm">
                          <p className="text-muted-foreground mb-1">{point.date}</p>
                          <p className="font-bold">{formatCurrency(val)}</p>
                          <p className={diff >= 0 ? 'text-[var(--profit)]' : 'text-[var(--loss)]'}>
                            {diff >= 0 ? '+' : ''}{formatCurrency(diff)} ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
                          </p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={isPositive ? 'var(--chart-1)' : 'var(--destructive)'}
                  strokeWidth={2}
                  fill="url(#portfolioGradient)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
