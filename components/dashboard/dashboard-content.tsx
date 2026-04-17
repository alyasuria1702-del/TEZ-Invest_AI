'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePortfolio } from '@/components/portfolio-context'
import { PortfolioSummary } from '@/components/dashboard/portfolio-summary'
import { PositionsTable } from '@/components/dashboard/positions-table'
import { AssetAllocationChart } from '@/components/dashboard/asset-allocation-chart'
import { PortfolioValueChart } from '@/components/dashboard/portfolio-value-chart'
import { EmptyPortfolio } from '@/components/dashboard/empty-portfolio'
import { DashboardPayments } from '@/components/dashboard/dashboard-payments'
import { Skeleton } from '@/components/ui/skeleton'
import type { PositionWithInstrument } from '@/lib/types/database'

export function DashboardContent() {
  const { activePortfolio, portfolios } = usePortfolio()
  const [positions, setPositions] = useState<PositionWithInstrument[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!activePortfolio) {
      setPositions([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const supabase = createClient()
    supabase
      .from('positions')
      .select('*, instrument:instruments(*)')
      .eq('portfolio_id', activePortfolio.id)
      .then(({ data }) => {
        setPositions((data ?? []) as PositionWithInstrument[])
        setIsLoading(false)
      })
  }, [activePortfolio?.id])

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    )
  }

  if (!activePortfolio || portfolios.length === 0) {
    return <EmptyPortfolio />
  }

  if (positions.length === 0) {
    return <EmptyPortfolio portfolioName={activePortfolio.name} />
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <PortfolioSummary positions={positions} />

      <div className="grid gap-6 md:grid-cols-2">
        <PortfolioValueChart positions={positions} portfolioId={activePortfolio.id} />
        <AssetAllocationChart positions={positions} />
      </div>

      <DashboardPayments portfolioId={activePortfolio.id} />

      <PositionsTable positions={positions} />
    </div>
  )
}
