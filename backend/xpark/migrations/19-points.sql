CREATE TABLE points_transaction (
    transaction_id SERIAL PRIMARY KEY,
    user_id uuid NOT NULL, -- Ensure the type matches users.id
    transaction_type VARCHAR(50) NOT NULL,    -- 'award' or 'spend'
    points_amount INTEGER NOT NULL,
    description TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    balance_after_transaction INTEGER,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

ALTER TABLE users
ADD COLUMN points jsonb NOT NULL DEFAULT '{"total": "0", "current": "0"}';

