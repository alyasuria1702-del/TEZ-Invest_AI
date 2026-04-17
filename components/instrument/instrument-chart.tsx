'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import type { Instrument } from '@/lib/types/database'
import { formatCurrency, formatShortDate } from '@/lib/utils/format'

interface InstrumentChartProps {
  instrument: Instrument
  priceHistory: { date: string; close: number; volume: number }[]
}

type Period = '1W' | '1M' | '3M' | '1Y'

export function InstrumentChart({ instrument, priceHistory }: InstrumentChartProps) {
  const [period, setPeriod] = useState<Period>('1M')
  
  // Filter data based on period
  const filteredData = filterByPeriod(priceHistory, period)
  
  const chartData = filteredData.map(item => ({
    date: formatShortDate(item.date),
    price: item.close,
    volume: item.volume,
  }))

  // Determine if trend is positive
  const isPositive = chartData.length > 1 
    ? chartData[chartData.length - 1].price >= chartData[0].price
    : true

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle>История цены</CardTitle>
        <ButtonGroup>
          {(['1W', '1M', '3M', '1Y'] as Period[]).map((p) => (
            <Button
              key={p}
              variant={period === p ? 'default' : 'outline'}
              size="sm"
              onClick={() => setPeriod(p)}
            >
              {p}
            </Button>
          ))}
        </ButtonGroup>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop 
                      offset="5%" 
                      stopColor={isPositive ? 'var(--profit)' : 'var(--loss)'} 
                      stopOpacity={0.3} 
                    />
                    <stop 
                      offset="95%" 
                      stopColor={isPositive ? 'var(--profit)' : 'var(--loss)'} 
                      stopOpacity={0} 
                    />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}
                  domain={['auto', 'auto']}
                  tickFormatter={(value) => formatCurrency(value)}
                  width={80}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="text-sm text-muted-foreground">
                            {payload[0].payload.date}
                          </div>
                          <div className="font-medium">
                            {formatCurrency(payload[0].value as number)}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke={isPositive ? 'var(--profit)' : 'var(--loss)'}
                  strokeWidth={2}
                  fill="url(#colorPrice)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex h-[300px] items-center justify-center text-muted-foreground">
            Нет данных о ценах
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function filterByPeriod(
  data: { date: string; close: number; volume: number }[],
  period: Period
): { date: string; close: number; volume: number }[] {
  if (data.length === 0) return data
  
  const now = new Date()
  let cutoff: Date
  
  switch (period) {
    case '1W':
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '1M':
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '3M':
      cutoff = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '1Y':
      cutoff = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
      break
  }
  
  return data.filter(item => new Date(item.date) >= cutoff)
}
