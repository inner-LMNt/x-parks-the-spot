ALTER TABLE users ADD COLUMN user_preferences jsonb NOT NULL DEFAULT '{"notification_time": "30"}';
UPDATE users SET user_preferences = '{"notification_time": "30"}' WHERE user_preferences IS NULL;