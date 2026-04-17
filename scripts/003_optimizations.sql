-- Migration 003: Optimizations and fixes
-- Run after 001_create_tables.sql and 002_profile_trigger.sql

-- ─── RLS policies (DROP + CREATE, т.к. IF NOT EXISTS не поддерживается) ────

DROP POLICY IF EXISTS "payments_delete_own" ON public.payments;
CREATE POLICY "payments_delete_own" ON public.payments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.positions
    JOIN public.portfolios ON portfolios.id = positions.portfolio_id
    WHERE positions.id = payments.position_id AND portfolios.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "ai_summaries_delete_own" ON public.ai_summaries;
CREATE POLICY "ai_summaries_delete_own" ON public.ai_summaries
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "ai_summaries_update_own" ON public.ai_summaries;
CREATE POLICY "ai_summaries_update_own" ON public.ai_summaries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "price_history_update_all" ON public.price_history;
CREATE POLICY "price_history_update_all" ON public.price_history
  FOR UPDATE TO authenticated USING (true);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ai_summaries_instrument_user
  ON public.ai_summaries(instrument_id, user_id);

CREATE INDEX IF NOT EXISTS idx_price_history_date
  ON public.price_history(trade_date);

-- ─── updated_at trigger function ────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS instruments_updated_at ON public.instruments;
CREATE TRIGGER instruments_updated_at
  BEFORE UPDATE ON public.instruments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS positions_updated_at ON public.positions;
CREATE TRIGGER positions_updated_at
  BEFORE UPDATE ON public.positions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS portfolios_updated_at ON public.portfolios;
CREATE TRIGGER portfolios_updated_at
  BEFORE UPDATE ON public.portfolios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
