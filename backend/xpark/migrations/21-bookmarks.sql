CREATE TABLE IF NOT EXISTS bookmarked_spots (
    id SERIAL PRIMARY KEY,
    parking_space_id UUID NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (parking_space_id, user_id)
);
