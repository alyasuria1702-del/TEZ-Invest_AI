'use client'

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Portfolio } from '@/lib/types/database'

interface PortfolioContextType {
  portfolios: Portfolio[]
  activePortfolio: Portfolio | null
  isLoading: boolean
  setActivePortfolio: (portfolio: Portfolio) => void
  createPortfolio: (name: string) => Promise<Portfolio | null>
  renamePortfolio: (id: string, name: string) => Promise<void>
  deletePortfolio: (id: string) => Promise<void>
  setDefaultPortfolio: (id: string) => Promise<void>
  refreshPortfolios: () => Promise<void>
}

const PortfolioContext = createContext<PortfolioContextType | null>(null)

export function usePortfolio() {
  const ctx = useContext(PortfolioContext)
  if (!ctx) throw new Error('usePortfolio must be used inside PortfolioProvider')
  return ctx
}

interface PortfolioProviderProps {
  children: React.ReactNode
  initialPortfolios: Portfolio[]
  userId: string
}

export function PortfolioProvider({ children, initialPortfolios, userId }: PortfolioProviderProps) {
  const [portfolios, setPortfolios] = useState<Portfolio[]>(initialPortfolios)
  const [activePortfolio, setActivePortfolioState] = useState<Portfolio | null>(
    initialPortfolios.find(p => p.is_default) ?? initialPortfolios[0] ?? null
  )
  const [isLoading, setIsLoading] = useState(false)

  const refreshPortfolios = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
    if (data) {
      setPortfolios(data as Portfolio[])
      // Keep active portfolio in sync
      setActivePortfolioState(prev => {
        if (!prev) return (data as Portfolio[]).find(p => p.is_default) ?? data[0] ?? null
        const updated = data.find(p => p.id === prev.id)
        return updated ?? (data as Portfolio[]).find(p => p.is_default) ?? data[0] ?? null
      })
    }
  }, [userId])

  const setActivePortfolio = useCallback((portfolio: Portfolio) => {
    setActivePortfolioState(portfolio)
  }, [])

  const createPortfolio = useCallback(async (name: string): Promise<Portfolio | null> => {
    const supabase = createClient()
    const isFirst = portfolios.length === 0
    const { data, error } = await supabase
      .from('portfolios')
      .insert({ user_id: userId, name, is_default: isFirst })
      .select()
      .single()
    if (error || !data) return null
    await refreshPortfolios()
    return data as Portfolio
  }, [portfolios.length, userId, refreshPortfolios])

  const renamePortfolio = useCallback(async (id: string, name: string) => {
    const supabase = createClient()
    await supabase.from('portfolios').update({ name }).eq('id', id)
    await refreshPortfolios()
  }, [refreshPortfolios])

  const deletePortfolio = useCallback(async (id: string) => {
    const supabase = createClient()
    await supabase.from('portfolios').delete().eq('id', id)
    await refreshPortfolios()
    // If we deleted the active portfolio, switch to default
    setActivePortfolioState(prev => {
      if (prev?.id !== id) return prev
      return portfolios.find(p => p.id !== id && p.is_default) ?? 
             portfolios.find(p => p.id !== id) ?? null
    })
  }, [portfolios, refreshPortfolios])

  const setDefaultPortfolio = useCallback(async (id: string) => {
    const supabase = createClient()
    // Clear existing default
    await supabase
      .from('portfolios')
      .update({ is_default: false })
      .eq('user_id', userId)
    // Set new default
    await supabase
      .from('portfolios')
      .update({ is_default: true })
      .eq('id', id)
    await refreshPortfolios()
  }, [userId, refreshPortfolios])

  return (
    <PortfolioContext.Provider value={{
      portfolios,
      activePortfolio,
      isLoading,
      setActivePortfolio,
      createPortfolio,
      renamePortfolio,
      deletePortfolio,
      setDefaultPortfolio,
      refreshPortfolios,
    }}>
      {children}
    </PortfolioContext.Provider>
  )
}
