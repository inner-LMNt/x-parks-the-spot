ALTER TABLE users ADD COLUMN responsiveness_score INT CHECK (responsiveness_score BETWEEN 1 AND 5) DEFAULT 5 NOT NULL;
-- ALTER TABLE reservations ADD COLUMN responsiveness_score INT CHECK (responsiveness_score BETWEEN 1 AND 5);
CREATE TABLE IF NOT EXISTS renter_ratings (
	id SERIAL,
	renter_id UUID,
	rater_id UUID,
	responsiveness_score INT CHECK (responsiveness_score BETWEEN 1 AND 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (renter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rater_id) REFERENCES users(id) ON DELETE CASCADE,
	UNIQUE (renter_id, rater_id)
);

CREATE OR REPLACE FUNCTION update_renter_ratings()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE users
        SET
            responsiveness_score = ROUND((
                SELECT AVG(responsiveness_score)::numeric
                FROM renter_ratings
                WHERE renter_id = NEW.renter_id
                AND responsiveness_score IS NOT NULL
            ), 2)
        WHERE id = NEW.renter_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE users
        SET
            responsiveness_score = ROUND((
                SELECT AVG(responsiveness_score)::numeric
                FROM renter_ratings
                WHERE renter_id = OLD.renter_id
                AND responsiveness_score IS NOT NULL
            ), 2)
        WHERE id = OLD.renter_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_renter_ratings
AFTER INSERT OR UPDATE OR DELETE ON renter_ratings
FOR EACH ROW
EXECUTE FUNCTION update_renter_ratings();
