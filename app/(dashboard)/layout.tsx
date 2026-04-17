import { AppSidebar } from '@/components/app-sidebar'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { PortfolioProvider } from '@/components/portfolio-context'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Portfolio } from '@/lib/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Load user profile for theme preference
  const { data: profile } = await supabase
    .from('profiles')
    .select('theme')
    .eq('id', user.id)
    .single()

  const userTheme = (profile?.theme as string) || 'system'

  // Load all portfolios server-side for initial hydration
  const { data: portfolios } = await supabase
    .from('portfolios')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  const portfolioList = (portfolios ?? []) as Portfolio[]

  // Ensure at least one default portfolio exists
  if (portfolioList.length > 0 && !portfolioList.some(p => p.is_default)) {
    await supabase
      .from('portfolios')
      .update({ is_default: true })
      .eq('id', portfolioList[0].id)
    portfolioList[0].is_default = true
  }

  return (
    <PortfolioProvider initialPortfolios={portfolioList} userId={user.id}>
      <SidebarProvider>
        <AppSidebar user={user} />
        <SidebarInset>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </PortfolioProvider>
  )
}
