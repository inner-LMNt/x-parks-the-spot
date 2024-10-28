CREATE TABLE IF NOT EXISTS timetable_coalesce (
    id SERIAL PRIMARY KEY,
    parking_space_id UUID NOT NULL,
	time tstzrange NOT NULL,
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- Adjust parking space schema
ALTER TABLE parking_spaces DROP features;
ALTER TABLE parking_spaces DROP pricing_info;
ALTER TABLE parking_spaces DROP dynamic_pricing_enabled;
ALTER TABLE parking_spaces DROP locked;
ALTER TABLE parking_spaces DROP locked_by;
ALTER TABLE parking_spaces DROP locked_until;
ALTER TABLE parking_spaces ADD price FLOAT;

-- Adjust cars schema to include timezone
ALTER TABLE cars ALTER created_at TYPE TIMESTAMPTZ;
ALTER TABLE cars ALTER updated_at TYPE TIMESTAMPTZ;

-- Adjust reservations schema to include timezone, and then convert to range
ALTER TABLE reservations ALTER start_time TYPE TIMESTAMPTZ;
ALTER TABLE reservations ALTER end_time TYPE TIMESTAMPTZ;
ALTER TABLE reservations ADD time TSTZRANGE;
UPDATE reservations SET time = TSTZRANGE(start_time, end_time, '[]');
ALTER TABLE reservations DROP start_time;
ALTER TABLE reservations DROP end_time;
ALTER TABLE reservations ALTER created_at TYPE TIMESTAMPTZ;
ALTER TABLE reservations ALTER updated_at TYPE TIMESTAMPTZ;

-- Create the SQL function that generates the coalesced timezones
CREATE OR REPLACE FUNCTION coalesce_timetable_by_parking_space_id(selected_parking_space_id UUID)
RETURNS SETOF tstzrange LANGUAGE plpgsql as $$
DECLARE
    curr paid_parking_allowed_availability;
    prev paid_parking_allowed_availability;
BEGIN
    for curr in
        SELECT * 
        FROM paid_parking_allowed_availability
		WHERE paid_parking_allowed_availability.parking_space_id = selected_parking_space_id
        ORDER BY time
    loop
        if prev.time && curr.time then 
            prev.time:= prev.time + curr.time;
        else
            if prev notnull then 
                return next prev.time;
            end if;
            prev:= curr;
        end if;
    end loop;
    return next prev.time;
end $$;

-- Generate the coalesced timetables
INSERT INTO timetable_coalesce (parking_space_id, time) 
	SELECT id, coalesce_timetable_by_parking_space_id(id)
	FROM parking_spaces WHERE is_paid = true
