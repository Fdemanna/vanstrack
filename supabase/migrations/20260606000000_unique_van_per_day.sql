-- ──────────────────────────────────────────────────────────────────────────
-- Migration: unique_van_per_day
-- Prevents two deliveries from using the same van on the same calendar date.
-- This is the server-side safety net complementing the UI-layer check.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_van_id_date_unique UNIQUE (van_id, date);
