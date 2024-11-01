ALTER TABLE cars ADD license_plate_state VARCHAR(2);
ALTER TABLE cars DROP CONSTRAINT cars_license_plate_key;
ALTER TABLE cars ADD CONSTRAINT unique_license_plate UNIQUE (license_plate, license_plate_state);
