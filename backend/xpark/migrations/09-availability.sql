CREATE TABLE IF NOT EXISTS paid_parking_allowed_availability (
	id SERIAL PRIMARY KEY,
	parking_space_id UUID REFERENCES parking_spaces(id) NOT NULL,
	time TSTZRANGE,
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
)
