'use client'

import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import {
  LayoutDashboard,
  Briefcase,
  FileUp,
  TrendingUp,
  LogOut,
  ChevronUp,
  Plus,
  Sun,
  Moon,
  Monitor,
  CalendarDays,
  Settings,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/client'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PortfolioSelector } from '@/components/portfolio-selector'

const menuItems = [
  { title: 'Дашборд',   url: '/dashboard',        icon: LayoutDashboard },
  { title: 'Портфель',  url: '/portfolio',         icon: Briefcase       },
  { title: 'Календарь', url: '/calendar',          icon: CalendarDays    },
  { title: 'Импорт',    url: '/portfolio/import',  icon: FileUp          },
  { title: 'Добавить',  url: '/portfolio/add',     icon: Plus            },
  { title: 'Настройки', url: '/settings',          icon: Settings        },
]

const themeOptions = [
  { value: 'light',  label: 'Светлая',  icon: Sun    },
  { value: 'dark',   label: 'Тёмная',   icon: Moon   },
  { value: 'system', label: 'Системная', icon: Monitor },
] as const

interface AppSidebarProps {
  user: User
}

export function AppSidebar({ user }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme)
    // Persist to profile
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('profiles')
          .update({ theme: newTheme })
          .eq('id', user.id)
      }
    } catch {
      // Non-critical — local theme already applied
    }
  }

  const userInitial = user.email?.charAt(0).toUpperCase() || 'U'
  const userEmail = user.email || ''

  const currentThemeOption = themeOptions.find(t => t.value === theme) ?? themeOptions[2]
  const ThemeIcon = currentThemeOption.icon

  return (
    <Sidebar>
      {/* ── Logo ── */}
      <SidebarHeader className="border-b border-sidebar-border pb-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard" className="group">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-[0_0_12px_oklch(0.78_0.13_72/0.4)]">
                  <TrendingUp className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="flex flex-col gap-0 leading-none">
                  <span className="font-semibold tracking-tight text-foreground">
                    Tez Invest
                    <span className="text-primary ml-1">AI</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground">Инвестиционный помощник</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {/* ── Portfolio Selector ── */}
        <SidebarGroup className="pb-0">
          <SidebarGroupContent>
            <PortfolioSelector />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {/* ── Nav ── */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium mb-1">
            Навигация
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = pathname === item.url ||
                  (item.url !== '/dashboard' && pathname.startsWith(item.url + '/'))
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className={
                        isActive
                          ? 'bg-primary/10 text-primary font-medium border-r-2 border-primary'
                          : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent'
                      }
                    >
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4 shrink-0" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* ── User footer ── */}
      <SidebarFooter className="border-t border-sidebar-border pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="hover:bg-sidebar-accent">
                  <Avatar className="h-7 w-7 ring-1 ring-primary/40">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                      {userInitial}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col gap-0 leading-none min-w-0">
                    <span className="text-xs font-medium truncate text-foreground">
                      {userEmail}
                    </span>
                    <span className="text-[10px] text-muted-foreground">Инвестор</span>
                  </div>
                  <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width]">
                {/* Theme switcher */}
                <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-medium py-1">
                  Тема оформления
                </DropdownMenuLabel>
                {themeOptions.map(opt => (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => handleThemeChange(opt.value)}
                    className="gap-2"
                  >
                    <opt.icon className="h-4 w-4" />
                    {opt.label}
                    {theme === opt.value && (
                      <span className="ml-auto text-primary text-xs">✓</span>
                    )}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Выйти
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
