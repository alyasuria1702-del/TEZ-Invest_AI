-- Migration 005: Telegram integration
-- Adds telegram_chat_id to profiles for bot authentication

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_profiles_telegram_chat_id
  ON public.profiles(telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

COMMENT ON COLUMN public.profiles.telegram_chat_id IS 'Telegram chat ID for bot notifications';
