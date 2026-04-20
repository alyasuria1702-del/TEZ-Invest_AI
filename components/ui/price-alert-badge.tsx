'use client'

import { TrendingUp, TrendingDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PriceAlertBadgeProps {
  changePct: number
  threshold?: number  // показывать только если |change| >= threshold (default 0)
  size?: 'sm' | 'md'
}

export function PriceAlertBadge({
  changePct,
  threshold = 0,
  size = 'sm',
}: PriceAlertBadgeProps) {
  if (Math.abs(changePct) < threshold) return null

  const isUp = changePct >= 0
  const isAlert = Math.abs(changePct) >= 3  // ≥3% — алерт-уровень

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded font-mono font-medium tabular-nums',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs',
        isUp
          ? isAlert
            ? 'bg-[var(--profit)]/20 text-[var(--profit)]'
            : 'bg-[var(--profit)]/10 text-[var(--profit)]/70'
          : isAlert
            ? 'bg-[var(--loss)]/20 text-[var(--loss)]'
            : 'bg-[var(--loss)]/10 text-[var(--loss)]/70'
      )}
      title={`Изменение за день: ${isUp ? '+' : ''}${changePct.toFixed(2)}%`}
    >
      {isUp
        ? <TrendingUp className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
        : <TrendingDown className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      }
      {isUp ? '+' : ''}{changePct.toFixed(1)}%
    </span>
  )
}
