import Link from 'next/link'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4 text-center max-w-sm">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <TrendingUp className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Страница не найдена
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Такой страницы не существует. Возможно, ссылка устарела или вы ввели адрес с ошибкой.
        </p>
        <div className="flex gap-3 mt-2">
          <Button asChild>
            <Link href="/dashboard">На дашборд</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/">На главную</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
