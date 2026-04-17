'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { PositionWithInstrument } from '@/lib/types/database'
import { calculatePortfolioMetrics } from '@/lib/utils/portfolio'
import { formatCurrency, formatPercent } from '@/lib/utils/format'

interface AssetAllocationChartProps {
  positions: PositionWithInstrument[]
}

const typeLabels = {
  bond: 'Облигации',
  stock: 'Акции',
  etf: 'Фонды',
}

const COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
]

export function AssetAllocationChart({ positions }: AssetAllocationChartProps) {
  const metrics = calculatePortfolioMetrics(positions)
  
  const chartData = metrics.assetAllocation.map((item, index) => ({
    name: typeLabels[item.type] || item.type,
    value: item.value,
    percent: item.percent,
    fill: COLORS[index % COLORS.length],
  }))

  if (chartData.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Структура портфеля</CardTitle>
        <CardDescription>
          Распределение по типам активов
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center">
          <div className="h-[200px] w-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.fill}
                      stroke="transparent"
                    />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-sm">
                          <div className="font-medium">{data.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {formatCurrency(data.value)} ({formatPercent(data.percent)})
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="mt-4 flex flex-wrap justify-center gap-4">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: item.fill }}
              />
              <span className="text-sm">
                {item.name}: {formatPercent(item.percent)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
