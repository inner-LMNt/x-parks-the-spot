UPDATE reports
SET type = 'Other'
WHERE type NOT IN ('Other', 'Reservation Issue', 'Renter Overstay', 'Damage Report');

ALTER TABLE reports
    DROP CONSTRAINT reports_type_check,
    ADD CONSTRAINT reports_type_check CHECK (type IN ('Other', 'Reservation Issue', 'Renter Overstay', 'Damage Report'));

ALTER TABLE reports
    ADD COlUMN user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    ADD COLUMN departure_time TIMESTAMPTZ,
    ADD COLUMN overstay_duration INTEGER,
    ADD COLUMN image_url TEXT,
    ADD COLUMN damage_type TEXT,
    ADD COLUMN damage_severity TEXT,
    ADD COLUMN overstay_charge NUMERIC(10,2);