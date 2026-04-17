'use client'

import { useState, useCallback } from 'react'
import { usePortfolio } from '@/components/portfolio-context'
import { useRouter } from 'next/navigation'
import {
  Upload, FileText, AlertCircle, CheckCircle2,
  ArrowLeft, Loader2, X, Info, FileSpreadsheet,
  ChevronDown, ChevronUp,
} from 'lucide-react'
import Link from 'next/link'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseCSV, parseXLSX, type ParsedRow, type ParseResult } from '@/lib/utils/import-parser'

interface ImportResult {
  ticker: string
  status: 'success' | 'error'
  message: string
}

const BROKER_LABELS: Record<string, { label: string; color: string }> = {
  tinkoff: { label: 'Т-Инвестиции', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  bcs:     { label: 'БКС', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  universal: { label: 'Универсальный формат', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  unknown: { label: 'Формат не определён', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' },
}

export default function ImportPage() {
  const router = useRouter()
  const { activePortfolio, portfolios } = usePortfolio()
  const [file, setFile] = useState<File | null>(null)
  const [parseResult, setParseResult] = useState<ParseResult | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [results, setResults] = useState<ImportResult[]>([])
  const [isDone, setIsDone] = useState(false)
  const [showFormatHelp, setShowFormatHelp] = useState(false)

  const processFile = useCallback(async (f: File) => {
    setFile(f)
    setParseResult(null)
    setResults([])
    setIsDone(false)
    setIsParsing(true)
    try {
      let result: ParseResult
      if (f.name.endsWith('.xlsx') || f.name.endsWith('.xls')) {
        result = await parseXLSX(f)
      } else {
        const text = await f.text()
        result = parseCSV(text)
      }
      setParseResult(result)
    } catch {
      setParseResult({ rows: [], broker: 'unknown', totalRows: 0, validRows: 0, errorRows: 0 })
    } finally {
      setIsParsing(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) processFile(f)
  }, [processFile])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) processFile(f)
  }

  const validRows = parseResult?.rows.filter(r => !r.error) ?? []
  const errorRows = parseResult?.rows.filter(r => r.error) ?? []

  const handleImport = async () => {
    if (!validRows.length) return
    setIsImporting(true)
    setImportProgress(0)
    const importResults: ImportResult[] = []
    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i]
      try {
        const res = await fetch('/api/positions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ticker: row.ticker,
            quantity: row.quantity,
            averageBuyPrice: row.averageBuyPrice,
            purchaseDate: row.purchaseDate || null,
            brokerAccount: row.brokerAccount || null,
            portfolioId: activePortfolio?.id || null,
          }),
        })
        const data = await res.json()
        importResults.push({
          ticker: row.ticker,
          status: res.ok ? 'success' : 'error',
          message: res.ok ? (data.action === 'updated' ? 'Обновлено' : 'Добавлено') : (data.error || 'Ошибка'),
        })
      } catch {
        importResults.push({ ticker: row.ticker, status: 'error', message: 'Ошибка сети' })
      }
      setImportProgress(Math.round(((i + 1) / validRows.length) * 100))
    }
    setResults(importResults)
    setIsImporting(false)
    setIsDone(true)
  }

  const successCount = results.filter(r => r.status === 'success').length
  const broker = parseResult?.broker ?? 'unknown'
  const brokerLabel = BROKER_LABELS[broker] ?? BROKER_LABELS.unknown

  return (
    <div className="flex flex-col">
      <DashboardHeader title="Импорт портфеля" />
      <div className="flex-1 p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
        <div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Назад</Link>
          </Button>
          {activePortfolio && (
            <p className="mt-2 text-sm text-muted-foreground">
              Импорт в портфель:{' '}
              <span className="font-medium text-foreground">{activePortfolio.name}</span>
            </p>
          )}
        </div>

        {/* Format guide */}
        <Card>
          <CardHeader className="pb-3 cursor-pointer select-none" onClick={() => setShowFormatHelp(v => !v)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Info className="h-4 w-4 text-blue-500" />
                Как выгрузить данные из брокерского приложения?
              </div>
              {showFormatHelp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
          </CardHeader>
          {showFormatHelp && (
            <CardContent>
              <Tabs defaultValue="tinkoff">
                <TabsList className="mb-4">
                  <TabsTrigger value="tinkoff">Т-Инвестиции</TabsTrigger>
                  <TabsTrigger value="bcs">БКС</TabsTrigger>
                  <TabsTrigger value="universal">Свой формат</TabsTrigger>
                </TabsList>
                <TabsContent value="tinkoff" className="text-sm space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">Выгрузка из Т-Инвестиций:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Откройте приложение Т-Инвестиции или сайт tinkoff.ru/invest</li>
                    <li>Перейдите в раздел <strong>«Портфель»</strong></li>
                    <li>Нажмите три точки (···) в правом верхнем углу</li>
                    <li>Выберите <strong>«Выгрузить отчёт»</strong> → <strong>«Портфель»</strong></li>
                    <li>Скачайте файл в формате <strong>Excel (.xlsx)</strong></li>
                    <li>Загрузите файл сюда — мы автоматически распознаем формат</li>
                  </ol>
                </TabsContent>
                <TabsContent value="bcs" className="text-sm space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">Выгрузка из БКС:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Зайдите в личный кабинет БКС на сайте broker.ru</li>
                    <li>Перейдите в раздел <strong>«Портфель»</strong> или <strong>«Отчёты»</strong></li>
                    <li>Выберите <strong>«Брокерский отчёт»</strong>, укажите период</li>
                    <li>Скачайте в формате <strong>Excel (.xlsx)</strong></li>
                    <li>Загрузите файл сюда</li>
                  </ol>
                  <p className="text-xs mt-2 text-blue-600 dark:text-blue-400">
                    💡 Если автодетект не сработал — используйте универсальный CSV-формат
                  </p>
                </TabsContent>
                <TabsContent value="universal" className="text-sm space-y-2 text-muted-foreground">
                  <p className="font-medium text-foreground">Создайте CSV вручную:</p>
                  <pre className="text-xs bg-muted px-3 py-2 rounded-md overflow-x-auto whitespace-pre">{`ticker;quantity;averageBuyPrice;purchaseDate;brokerAccount\nSBER;100;280.50;2024-01-15;ИИС\nGAZP;50;165.00;2024-03-01;Основной\nSU26238RMFS4;20;950.30;;ИИС\nTMOS;500;6.80;;Основной`}</pre>
                  <p className="text-xs">Разделитель: ; или , · Кодировка: UTF-8 · Цена через точку</p>
                </TabsContent>
              </Tabs>
            </CardContent>
          )}
        </Card>

        {/* Drop zone */}
        {!file && (
          <Card>
            <CardHeader>
              <CardTitle>Загрузите файл</CardTitle>
              <CardDescription>Excel (.xlsx) или CSV — форматы Т-Инвестиций, БКС и универсальный</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`rounded-xl border-2 border-dashed p-12 text-center transition-all ${
                  isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                }`}
              >
                <div className="flex justify-center gap-4 mb-4">
                  <FileSpreadsheet className="h-12 w-12 text-green-500" />
                  <FileText className="h-12 w-12 text-blue-500" />
                </div>
                <p className="text-lg font-medium mb-1">Перетащите файл сюда</p>
                <p className="text-sm text-muted-foreground mb-6">Excel (.xlsx) или CSV — определим формат автоматически</p>
                <label>
                  <Button variant="outline" asChild>
                    <span className="cursor-pointer">
                      <Upload className="mr-2 h-4 w-4" />Выбрать файл
                    </span>
                  </Button>
                  <input type="file" accept=".csv,.xlsx,.xls,.txt" className="hidden" onChange={handleFileInput} />
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Parsing */}
        {isParsing && (
          <Card>
            <CardContent className="py-12 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Читаем файл и определяем формат...</p>
            </CardContent>
          </Card>
        )}

        {/* Preview */}
        {file && parseResult && !isDone && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                {file.name.endsWith('.xlsx') || file.name.endsWith('.xls')
                  ? <FileSpreadsheet className="h-5 w-5 text-green-500" />
                  : <FileText className="h-5 w-5 text-blue-500" />
                }
                <span className="font-medium">{file.name}</span>
                <Badge variant="secondary">{parseResult.totalRows} строк</Badge>
                <Badge className={brokerLabel.color}>{brokerLabel.label}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => { setFile(null); setParseResult(null) }}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {errorRows.length > 0 && (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <CardTitle className="text-base">Строки с ошибками ({errorRows.length})</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1">
                  {errorRows.slice(0, 5).map((row, i) => (
                    <p key={i} className="text-sm text-destructive">{row.ticker || '(пусто)'}: {row.error}</p>
                  ))}
                  {errorRows.length > 5 && <p className="text-xs text-muted-foreground">...и ещё {errorRows.length - 5}</p>}
                </CardContent>
              </Card>
            )}

            {validRows.length > 0 ? (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Готово к импорту: {validRows.length} позиций</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border overflow-hidden mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Тикер</TableHead>
                          <TableHead className="text-right">Кол-во</TableHead>
                          <TableHead className="text-right">Ср. цена</TableHead>
                          <TableHead>Дата</TableHead>
                          <TableHead>Счёт</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {validRows.slice(0, 15).map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono font-medium">{row.ticker}</TableCell>
                            <TableCell className="text-right font-mono">{row.quantity}</TableCell>
                            <TableCell className="text-right font-mono">{row.averageBuyPrice}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{row.purchaseDate || '—'}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">{row.brokerAccount || '—'}</TableCell>
                          </TableRow>
                        ))}
                        {validRows.length > 15 && (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-muted-foreground text-sm py-2">
                              ...и ещё {validRows.length - 15} позиций
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {isImporting && (
                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Импортируем позиции...</span>
                        <span>{importProgress}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${importProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <Button className="w-full" onClick={handleImport} disabled={isImporting}>
                    {isImporting
                      ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Импортируем...</>
                      : <><Upload className="mr-2 h-4 w-4" />Импортировать {validRows.length} позиций</>
                    }
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20">
                <CardContent className="pt-6 text-center text-sm text-orange-700 dark:text-orange-300">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">Не удалось распознать данные</p>
                  <p className="mt-1 text-xs">Проверьте, что файл содержит колонки с тикером, количеством и ценой</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Results */}
        {isDone && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-6 w-6 text-[var(--profit)]" />
                <CardTitle>Импорт завершён</CardTitle>
              </div>
              <CardDescription>
                Успешно: {successCount} из {results.length}
                {results.length - successCount > 0 && ` · Ошибок: ${results.length - successCount}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Тикер</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Сообщение</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono font-medium">{r.ticker}</TableCell>
                        <TableCell>
                          <Badge className={r.status === 'success'
                            ? 'bg-[var(--profit)]/20 text-[var(--profit)]'
                            : 'bg-destructive/20 text-destructive'
                          }>
                            {r.status === 'success' ? '✓ OK' : '✗ Ошибка'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{r.message}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/dashboard')} className="flex-1">Перейти в портфель</Button>
                <Button variant="outline" onClick={() => { setFile(null); setParseResult(null); setResults([]); setIsDone(false) }}>
                  Загрузить ещё
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
