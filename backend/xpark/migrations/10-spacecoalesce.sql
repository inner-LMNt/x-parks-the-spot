CREATE TABLE IF NOT EXISTS timetable_coalesce (
    id SERIAL PRIMARY KEY,
    spot_id UUID NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    FOREIGN KEY (spot_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
    CHECK (end_time > start_time)
);
