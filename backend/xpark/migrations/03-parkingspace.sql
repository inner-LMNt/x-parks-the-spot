CREATE TABLE parking_spaces (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	owner UUID REFERENCES users(id) NOT NULL,
	location geography(POINT,4326) -- WGS84 geodetic coordinate system (SRID 4326)
)
