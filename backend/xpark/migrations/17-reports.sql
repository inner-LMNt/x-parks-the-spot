UPDATE reports
SET type = 'Other'
WHERE type NOT IN ('Other', 'Reservation Issue', 'Renter Overstay', 'Damage Report');

ALTER TABLE reports
    DROP CONSTRAINT reports_type_check,
    ADD CONSTRAINT reports_type_check CHECK (type IN ('Other', 'Reservation Issue', 'Renter Overstay', 'Damage Report'));
