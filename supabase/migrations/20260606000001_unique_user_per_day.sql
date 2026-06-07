-- ──────────────────────────────────────────────────────────────────────────
-- Migration: unique_user_per_day
-- A single worker (user_id) can only have ONE active delivery per calendar
-- date. This is the server-side complement to the UI-layer restriction.
-- ──────────────────────────────────────────────────────────────────────────

ALTER TABLE deliveries
  ADD CONSTRAINT deliveries_user_id_date_unique UNIQUE (user_id, date);
