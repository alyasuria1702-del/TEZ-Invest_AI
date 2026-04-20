'use client'

import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TooltipMetricProps {
  label: string
  hint: string
}

export function TooltipMetric({ label, hint }: TooltipMetricProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 cursor-help">
            <span>{label}</span>
            <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground transition-colors" />
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="max-w-[220px] text-xs leading-relaxed"
        >
          {hint}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
