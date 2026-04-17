-- Tez Invest AI: Database Schema
-- Run this migration to create all required tables

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Portfolios
CREATE TABLE IF NOT EXISTS public.portfolios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Мой портфель',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Instruments (cached from MOEX)
CREATE TABLE IF NOT EXISTS public.instruments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticker TEXT NOT NULL UNIQUE,
  isin TEXT,
  name TEXT NOT NULL,
  short_name TEXT,
  instrument_type TEXT NOT NULL CHECK (instrument_type IN ('bond', 'stock', 'etf')),
  currency TEXT DEFAULT 'RUB',
  board_id TEXT,
  -- Bond specific
  coupon_rate DECIMAL,
  coupon_value DECIMAL,
  maturity_date DATE,
  face_value DECIMAL,
  -- General
  lot_size INTEGER DEFAULT 1,
  last_price DECIMAL,
  price_change_percent DECIMAL,
  price_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Positions
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id),
  quantity INTEGER NOT NULL,
  average_buy_price DECIMAL NOT NULL,
  purchase_date DATE,
  broker_account TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Payments (coupons and dividends)
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  instrument_id UUID NOT NULL REFERENCES public.instruments(id),
  payment_type TEXT NOT NULL CHECK (payment_type IN ('coupon', 'dividend')),
  record_date DATE,
  payment_date DATE,
  amount_per_unit DECIMAL,
  total_amount DECIMAL,
  currency TEXT DEFAULT 'RUB',
  status TEXT DEFAULT 'expected' CHECK (status IN ('expected', 'accrued', 'paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI Summaries
CREATE TABLE IF NOT EXISTS public.ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES public.instruments(id),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Price History
CREATE TABLE IF NOT EXISTS public.price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument_id UUID NOT NULL REFERENCES public.instruments(id),
  trade_date DATE NOT NULL,
  close_price DECIMAL NOT NULL,
  volume BIGINT,
  UNIQUE(instrument_id, trade_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON public.portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_portfolio_id ON public.positions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_positions_instrument_id ON public.positions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_payments_position_id ON public.payments(position_id);
CREATE INDEX IF NOT EXISTS idx_payments_instrument_id ON public.payments(instrument_id);
CREATE INDEX IF NOT EXISTS idx_price_history_instrument_date ON public.price_history(instrument_id, trade_date);
CREATE INDEX IF NOT EXISTS idx_instruments_ticker ON public.instruments(ticker);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- RLS Policies for portfolios
CREATE POLICY "portfolios_select_own" ON public.portfolios FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "portfolios_insert_own" ON public.portfolios FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "portfolios_update_own" ON public.portfolios FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "portfolios_delete_own" ON public.portfolios FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for positions (via portfolio ownership)
CREATE POLICY "positions_select_own" ON public.positions FOR SELECT 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "positions_insert_own" ON public.positions FOR INSERT 
  WITH CHECK (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "positions_update_own" ON public.positions FOR UPDATE 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()));
CREATE POLICY "positions_delete_own" ON public.positions FOR DELETE 
  USING (EXISTS (SELECT 1 FROM public.portfolios WHERE portfolios.id = positions.portfolio_id AND portfolios.user_id = auth.uid()));

-- RLS Policies for payments (via position/portfolio ownership)
CREATE POLICY "payments_select_own" ON public.payments FOR SELECT 
  USING (EXISTS (
    SELECT 1 FROM public.positions 
    JOIN public.portfolios ON portfolios.id = positions.portfolio_id 
    WHERE positions.id = payments.position_id AND portfolios.user_id = auth.uid()
  ));
CREATE POLICY "payments_insert_own" ON public.payments FOR INSERT 
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.positions 
    JOIN public.portfolios ON portfolios.id = positions.portfolio_id 
    WHERE positions.id = payments.position_id AND portfolios.user_id = auth.uid()
  ));

-- RLS Policies for ai_summaries
CREATE POLICY "ai_summaries_select_own" ON public.ai_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "ai_summaries_insert_own" ON public.ai_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for instruments (read-only for all authenticated)
CREATE POLICY "instruments_select_all" ON public.instruments FOR SELECT TO authenticated USING (true);
CREATE POLICY "instruments_insert_all" ON public.instruments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "instruments_update_all" ON public.instruments FOR UPDATE TO authenticated USING (true);

-- RLS Policies for price_history (read-only for all authenticated)
CREATE POLICY "price_history_select_all" ON public.price_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "price_history_insert_all" ON public.price_history FOR INSERT TO authenticated WITH CHECK (true);
