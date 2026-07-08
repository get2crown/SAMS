-- Configurable per-company late-arrival cutoff, replacing the hardcoded 9am
-- used in analytics queries.
ALTER TABLE companies ADD COLUMN IF NOT EXISTS late_arrival_cutoff TIME NOT NULL DEFAULT '09:00:00';
