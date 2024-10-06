CREATE TABLE user_tokens (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    token TEXT UNIQUE NOT NULL,
    expiry TIMESTAMP NOT NULL
);