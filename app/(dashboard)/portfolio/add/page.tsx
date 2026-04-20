'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { usePortfolio } from '@/components/portfolio-context'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Plus, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface SearchResult {
  ticker: string
  name: string
  shortName: string
  type: string
  isin: string
}

function AddPositionForm() {
  const router = useRouter()
  const { activePortfolio } = usePortfolio()
  const searchParams = useSearchParams()
  const preselectedTicker = searchParams.get('ticker') || ''

  const [searchQuery, setSearchQuery] = useState(preselectedTicker)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTicker, setSelectedTicker] = useState(preselectedTicker)
  const [selectedName, setSelectedName] = useState('')

  const [quantity, setQuantity] = useState('')
  const [avgPrice, setAvgPrice] = useState('')
  const [purchaseDate, setPurchaseDate] = useState('')
  const [brokerAccount, setBrokerAccount] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setIsSearching(true)
    try {
      const res = await fetch(
        `https://iss.moex.com/iss/securities.json?q=${encodeURIComponent(query)}&limit=10`
      )
      const json = await res.json()
      const secs = json.securities
      if (!secs?.data?.length) {
        setSearchResults([])
        return
      }

      const cols = secs.columns as string[]
      const results: SearchResult[] = secs.data
        .slice(0, 8)
        .map((row: unknown[]) => {
          const get = (field: string) => row[cols.indexOf(field)] as string
          return {
            ticker: get('secid'),
            name: get('name'),
            shortName: get('shortname'),
            type: get('type'),
            isin: get('isin') || '',
          }
        })
        .filter((r: SearchResult) => r.ticker && r.name)

      setSearchResults(results)
    } catch {
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!selectedName) {
        handleSearch(searchQuery)
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, selectedName, handleSearch])

  const selectInstrument = (result: SearchResult) => {
    setSelectedTicker(result.ticker)
    setSelectedName(result.name)
    setSearchQuery(result.ticker)
    setSearchResults([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicker) {
      setError('Выберите инструмент из списка')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const res = await fetch('/api/positions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: selectedTicker || searchQuery.toUpperCase().trim(),
          quantity: Number(quantity),
          averageBuyPrice: Number(avgPrice),
          purchaseDate: purchaseDate || null,
          brokerAccount: brokerAccount || null,
          portfolioId: activePortfolio?.id || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Ошибка добавления позиции')
        return
      }

      setSuccess(true)
      setTimeout(() => router.push('/dashboard'), 1500)
    } catch {
      setError('Произошла ошибка. Попробуйте ещё раз.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="flex h-[calc(100vh-200px)] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <CheckCircle2 className="h-16 w-16 text-[var(--profit)]" />
          <h2 className="text-2xl font-bold">Позиция добавлена!</h2>
          <p className="text-muted-foreground">Перенаправляем на дашборд...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Назад
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Добавить позицию</CardTitle>
          <CardDescription>
            Найдите инструмент и укажите параметры вашей сделки
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Instrument search */}
            <div className="space-y-2">
              <Label htmlFor="search">Инструмент *</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Введите тикер или название (SBER, Газпром...)"
                  value={searchQuery}
                  onChange={(e) => {
                    const val = e.target.value
                    setSearchQuery(val)
                    setSelectedTicker(val.toUpperCase().trim())
                    setSelectedName('')
                  }}
                  className="pl-10"
                  autoComplete="off"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Search results dropdown */}
              {searchResults.length > 0 && !selectedName && (
                <div className="rounded-md border bg-popover shadow-md overflow-hidden">
                  {searchResults.map((result) => (
                    <button
                      key={result.ticker}
                      type="button"
                      onClick={() => selectInstrument(result)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-accent text-left transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-medium text-sm">{result.ticker}</span>
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {result.isin}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {result.name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {selectedName ? (
                <p className="text-sm text-[var(--profit)]">
                  ✓ {selectedTicker} — {selectedName}
                </p>
              ) : searchQuery.trim() && searchResults.length === 0 && !isSearching ? (
                <p className="text-xs text-muted-foreground">
                  Тикер будет проверен на MOEX при добавлении
                </p>
              ) : null}
            </div>

            {/* Quantity */}
            <div className="space-y-2">
              <Label htmlFor="quantity">Количество (шт.) *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                step="1"
                placeholder="100"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
              />
            </div>

            {/* Average buy price */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="avg-price">Средняя цена покупки *</Label>
              </div>
              <Input
                id="avg-price"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="150.50"
                value={avgPrice}
                onChange={(e) => setAvgPrice(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Рублёвые инструменты — в рублях. Акции США (AMD, AAPL) — в долларах.
              </p>
            </div>

            {/* Purchase date */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="date">Дата покупки</Label>
                <span className="text-xs text-muted-foreground">необязательно</span>
              </div>
              <Input
                id="date"
                type="date"
                value={purchaseDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>

            {/* Broker account */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="broker">Счёт / метка</Label>
                <span className="text-xs text-muted-foreground">необязательно</span>
              </div>
              <Input
                id="broker"
                placeholder="Например: ИИС, Брокерский, Т-Банк"
                value={brokerAccount}
                onChange={(e) => setBrokerAccount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Произвольная метка для фильтрации — имя брокера или тип счёта
              </p>
            </div>

            {error && (
              <p className="text-sm text-destructive rounded-md bg-destructive/10 px-4 py-3">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !searchQuery.trim() || !quantity || !avgPrice}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Добавление...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить в портфель
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AddPositionPage() {
  return (
    <div className="flex flex-col">
      <DashboardHeader title="Добавить позицию" />
      <Suspense fallback={<div className="p-6"><Loader2 className="animate-spin" /></div>}>
        <AddPositionForm />
      </Suspense>
    </div>
  )
}
