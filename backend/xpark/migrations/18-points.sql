ALTER TABLE users
ADD COLUMN points jsonb NOT NULL DEFAULT '{"total": "0", "current": "0"}';