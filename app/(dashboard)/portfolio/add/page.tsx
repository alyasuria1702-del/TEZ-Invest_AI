'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { usePortfolio } from '@/components/portfolio-context'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { PortfolioManage } from '@/components/portfolio/portfolio-manage'
import { EmptyPortfolio } from '@/components/dashboard/empty-portfolio'
import { Skeleton } from '@/components/ui/skeleton'
import type { PositionWithInstrument } from '@/lib/types/database'

export default function PortfolioPage() {
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
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setPositions((data ?? []) as PositionWithInstrument[])
        setIsLoading(false)
      })
  }, [activePortfolio?.id])

  return (
    <div className="flex flex-col">
      <DashboardHeader title={activePortfolio ? 'Портфель \u00b7 ' + activePortfolio.name : 'Портфель'} />
      <div className="flex-1 p-4 md:p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : !activePortfolio || portfolios.length === 0 ? (
          <EmptyPortfolio />
        ) : (
          <PortfolioManage
            portfolio={activePortfolio}
            positions={positions}
          />
        )}
      </div>
    </div>
  )
}
