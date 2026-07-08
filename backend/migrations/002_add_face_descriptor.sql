-- Server-side biometric enrollment
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_descriptor JSONB;
ALTER TABLE users ADD COLUMN IF NOT EXISTS face_enrolled_at TIMESTAMP;
