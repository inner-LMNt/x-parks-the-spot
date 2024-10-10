CREATE TYPE verification_statuses AS ENUM ('pending', 'approved', 'denied');

ALTER TABLE parking_spaces
ADD COLUMN is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN photos TEXT[],
ADD COLUMN verification_status TEXT,
ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN address TEXT;
