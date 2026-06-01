ALTER TABLE public.ride_requests
  ADD COLUMN IF NOT EXISTS stops jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS duration_minutes integer,
  ADD COLUMN IF NOT EXISTS route_source text NOT NULL DEFAULT 'manual_fallback';