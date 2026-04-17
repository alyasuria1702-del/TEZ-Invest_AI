'use client'

import Link from 'next/link'
import { Briefcase, FileUp, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyTitle } from '@/components/ui/empty'

interface EmptyPortfolioProps {
  portfolioName?: string
}

export function EmptyPortfolio({ portfolioName }: EmptyPortfolioProps) {
  return (
    <div className="flex h-[calc(100vh-200px)] items-center justify-center">
      <Empty>
        <Briefcase className="h-12 w-12 text-muted-foreground" />
        <EmptyTitle>
          {portfolioName ? `«${portfolioName}» пуст` : 'Портфель пуст'}
        </EmptyTitle>
        <EmptyDescription>
          Загрузите выписку из брокерского приложения — портфель появится за минуту.
          Или добавьте позиции вручную по одной.
        </EmptyDescription>
        <div className="mt-6 flex flex-col items-center gap-3">
          {/* Primary action — крупная, выделенная */}
          <Button size="lg" asChild className="w-full max-w-xs">
            <Link href="/portfolio/import">
              <FileUp className="mr-2 h-4 w-4" />
              Импортировать портфель
            </Link>
          </Button>
          {/* Secondary action — меньше, нейтральная */}
          <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
            <Link href="/portfolio/add">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Добавить позицию вручную
            </Link>
          </Button>
        </div>
      </Empty>
    </div>
  )
}
