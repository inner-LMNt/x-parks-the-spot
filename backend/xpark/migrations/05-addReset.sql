ALTER TABLE users
ADD COLUMN reset_requested_at TIMESTAMP,
ADD COLUMN reset_token TEXT;
