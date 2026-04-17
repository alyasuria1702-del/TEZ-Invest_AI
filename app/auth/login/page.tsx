'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { TrendingUp } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Произошла ошибка')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh w-full items-center justify-center overflow-hidden p-6 md:p-10">
      {/* Background grid + glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,oklch(0.22_0.05_258/0.5),transparent)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_80%,oklch(0.78_0.13_72/0.06),transparent)]" />

      <div className="relative w-full max-w-sm">
        <div className="flex flex-col gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary shadow-[0_0_24px_oklch(0.78_0.13_72/0.5)]">
              <TrendingUp className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-semibold tracking-tight">
                Tez Invest<span className="text-primary"> AI</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">Инвестиционный помощник</p>
            </div>
          </div>

          <Card className="border-border/60 bg-card/80 backdrop-blur-sm shadow-[0_8px_32px_oklch(0_0_0/0.4)]">
            <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <CardHeader className="pb-4">
              <CardTitle className="text-xl tracking-tight">Вход в аккаунт</CardTitle>
              <CardDescription>Введите ваши данные для входа</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin}>
                <div className="flex flex-col gap-5">
                  <div className="grid gap-2">
                    <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="investor@example.com"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="bg-input/60 border-border/60 focus:border-primary/60"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">Пароль</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-input/60 border-border/60 focus:border-primary/60"
                    />
                  </div>
                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">{error}</p>
                  )}
                  <Button
                    type="submit"
                    className="w-full font-medium shadow-[0_4px_16px_oklch(0.78_0.13_72/0.3)] hover:shadow-[0_4px_24px_oklch(0.78_0.13_72/0.5)] transition-shadow"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Вход...' : 'Войти'}
                  </Button>
                </div>
                <div className="mt-5 text-center text-sm text-muted-foreground">
                  Нет аккаунта?{' '}
                  <Link href="/auth/sign-up" className="text-primary hover:text-primary/80 underline underline-offset-4">
                    Зарегистрироваться
                  </Link>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
