-- Migration: Multi-portfolio support + theme preference
-- Run this after 001_create_tables.sql

-- Add is_default flag to portfolios
ALTER TABLE public.portfolios
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;

-- Ensure only one default per user (partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_portfolios_user_default
  ON public.portfolios (user_id)
  WHERE (is_default = true);

-- Add theme preference to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'system'
  CHECK (theme IN ('light', 'dark', 'system'));

-- Set existing portfolios as default (one per user) if none is set
UPDATE public.portfolios p
SET is_default = true
WHERE p.created_at = (
  SELECT MIN(p2.created_at)
  FROM public.portfolios p2
  WHERE p2.user_id = p.user_id
)
AND NOT EXISTS (
  SELECT 1 FROM public.portfolios p3
  WHERE p3.user_id = p.user_id AND p3.is_default = true
);
