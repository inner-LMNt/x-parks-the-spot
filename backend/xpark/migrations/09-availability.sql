CREATE TABLE IF NOT EXISTS paid_parking_allowed_availability (
	id SERIAL PRIMARY KEY,
    parking_space_id UUID REFERENCES parking_spaces(id) NOT NULL,
	day_of_week INT NOT NULL,
	-- Timezones woo
	start_time TIMESTAMP NOT NULL,
	end_time TIMESTAMP NOT NULL,
	CHECK (end_time > start_time)
)
