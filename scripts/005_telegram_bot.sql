-- Migration 005: Telegram bot integration
-- Run in Supabase SQL Editor after 004_multi_portfolio_theme.sql

-- ─── Table: telegram_connections ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.telegram_connections (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  telegram_chat_id    BIGINT NOT NULL UNIQUE,
  telegram_username   TEXT,
  portfolio_id        UUID REFERENCES public.portfolios(id) ON DELETE SET NULL,
  alerts_enabled      BOOLEAN NOT NULL DEFAULT true,
  alert_days_before   INTEGER NOT NULL DEFAULT 3,
  connected_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_telegram_connections_user_id
  ON public.telegram_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_telegram_connections_chat_id
  ON public.telegram_connections(telegram_chat_id);

-- RLS
ALTER TABLE public.telegram_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tg_select_own" ON public.telegram_connections;
CREATE POLICY "tg_select_own" ON public.telegram_connections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tg_insert_own" ON public.telegram_connections;
CREATE POLICY "tg_insert_own" ON public.telegram_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tg_update_own" ON public.telegram_connections;
CREATE POLICY "tg_update_own" ON public.telegram_connections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tg_delete_own" ON public.telegram_connections;
CREATE POLICY "tg_delete_own" ON public.telegram_connections
  FOR DELETE USING (auth.uid() = user_id);

-- ─── pg_cron: daily alerts at 09:00 Moscow time (06:00 UTC) ─────────────────
-- Run this AFTER deploying the telegram-alerts Edge Function
-- Replace YOUR_SUPABASE_URL and YOUR_SERVICE_ROLE_KEY with real values

-- SELECT cron.schedule(
--   'daily-telegram-alerts',
--   '0 6 * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://YOUR_SUPABASE_URL/functions/v1/telegram-alerts',
--     headers := '{"Authorization": "Bearer YOUR_SERVICE_ROLE_KEY", "Content-Type": "application/json"}'::jsonb,
--     body := '{}'::jsonb
--   );
--   $$
-- );
