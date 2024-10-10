CREATE TABLE IF NOT EXISTS paid_parking_allowed_availability (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parking_space_id UUID REFERENCES parking_spaces(id) NOT NULL,
	-- Timezones woo
	start_time TIMESTAMP NOT NULL,
	end_time TIMESTAMP NOT NULL,
	CHECK (end_time > start_time)
)
