CREATE TABLE IF NOT EXISTS ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parking_space_id UUID NOT NULL REFERENCES parking_spaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    availability_rating INT CHECK (availability_rating BETWEEN 1 AND 5),
    cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
    total_rating DECIMAL(3,2) GENERATED ALWAYS AS (
        CASE
            WHEN availability_rating IS NOT NULL AND cleanliness_rating IS NOT NULL
            THEN (availability_rating + cleanliness_rating) / 2.0
            WHEN availability_rating IS NOT NULL
            THEN availability_rating
            WHEN cleanliness_rating IS NOT NULL
            THEN cleanliness_rating
            ELSE NULL
        END
    ) STORED,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (parking_space_id, user_id)
);

ALTER TABLE parking_spaces
    ADD COLUMN IF NOT EXISTS avg_availability_rating DECIMAL(3,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avg_cleanliness_rating DECIMAL(3,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS avg_total_rating DECIMAL(3,2) DEFAULT NULL,
    ADD COLUMN IF NOT EXISTS ratings_count_availability INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ratings_count_cleanliness INT DEFAULT 0;

CREATE OR REPLACE FUNCTION update_parking_space_ratings()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = NEW.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = NEW.parking_space_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE parking_spaces
        SET
            avg_availability_rating = ROUND((
                SELECT AVG(availability_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ), 2),
            avg_cleanliness_rating = ROUND((
                SELECT AVG(cleanliness_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            ), 2),
            avg_total_rating = ROUND((
                SELECT AVG(total_rating)::numeric
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
            ), 2),
            ratings_count_availability = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND availability_rating IS NOT NULL
            ),
            ratings_count_cleanliness = (
                SELECT COUNT(*)
                FROM ratings
                WHERE parking_space_id = OLD.parking_space_id
                AND cleanliness_rating IS NOT NULL
            )
        WHERE id = OLD.parking_space_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_parking_space_ratings
AFTER INSERT OR UPDATE OR DELETE ON ratings
FOR EACH ROW
EXECUTE FUNCTION update_parking_space_ratings();

CREATE INDEX IF NOT EXISTS idx_ratings_parking_space_id ON ratings(parking_space_id);
CREATE INDEX IF NOT EXISTS idx_ratings_user_id ON ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_ratings_availability_rating ON ratings(availability_rating);
CREATE INDEX IF NOT EXISTS idx_ratings_cleanliness_rating ON ratings(cleanliness_rating);