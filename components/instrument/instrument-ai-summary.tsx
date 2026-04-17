'use client'

import { useState, useEffect, useCallback } from 'react'
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { Instrument } from '@/lib/types/database'

interface InstrumentAiSummaryProps {
  instrument: Instrument
  userId: string
}

export function InstrumentAiSummary({ instrument, userId }: InstrumentAiSummaryProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null)

  const fetchSummary = useCallback(async (forceRefresh = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instrumentId: instrument.id,
          ticker: instrument.ticker,
          name: instrument.name,
          instrumentType: instrument.instrument_type,
          lastPrice: instrument.last_price,
          priceChangePercent: instrument.price_change_percent,
          couponRate: instrument.coupon_rate,
          couponValue: instrument.coupon_value,
          maturityDate: instrument.maturity_date,
          forceRefresh,
        }),
      })

      if (!res.ok) throw new Error('Ошибка генерации')

      const data = await res.json()
      setSummary(data.summary)
      setGeneratedAt(new Date(data.generatedAt))
    } catch {
      setError('Не удалось сгенерировать аналитику. Попробуйте ещё раз.')
    } finally {
      setIsLoading(false)
    }
  }, [instrument])

  useEffect(() => {
    fetchSummary(false)
  }, [fetchSummary])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>ИИ-аналитика</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchSummary(true)}
            disabled={isLoading}
            className="h-8 gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Обновить
          </Button>
        </div>
        <CardDescription>
          Краткий информационный вывод по инструменту
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && !summary && (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[90%]" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[85%]" />
          </div>
        )}

        {error && !isLoading && (
          <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {summary && !error && (
          <div className="space-y-3">
            <p className={`text-sm leading-relaxed ${isLoading ? 'opacity-50' : ''}`}>
              {summary}
            </p>
            {generatedAt && (
              <p className="text-xs text-muted-foreground">
                Сформировано: {generatedAt.toLocaleString('ru-RU', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            )}
            <p className="text-xs text-muted-foreground border-t pt-2">
              Носит исключительно информационный характер. Не является инвестиционной рекомендацией.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
