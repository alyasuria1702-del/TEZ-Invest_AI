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
          Добавьте инструменты в портфель, чтобы начать отслеживать инвестиции
        </EmptyDescription>
        <div className="mt-6 flex gap-4">
          <Button asChild>
            <Link href="/portfolio/import">
              <FileUp className="mr-2 h-4 w-4" />
              Импорт портфеля
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/portfolio/add">
              <Plus className="mr-2 h-4 w-4" />
              Добавить вручную
            </Link>
          </Button>
        </div>
      </Empty>
    </div>
  )
}
