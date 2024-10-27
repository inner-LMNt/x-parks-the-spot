CREATE TABLE IF NOT EXISTS timetable_coalesce (
    id SERIAL PRIMARY KEY,
    parking_space_id UUID NOT NULL,
	time tstzrange NOT NULL,
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE
);

-- Convert start_time, end_time to tstzrange
ALTER TABLE paid_parking_allowed_availability ADD time TSTZRANGE;
UPDATE paid_parking_allowed_availability SET time = TSTZRANGE(start_time, end_time, '[]');
ALTER TABLE paid_parking_allowed_availability DROP start_time;
ALTER TABLE paid_parking_allowed_availability DROP end_time;
ALTER TABLE paid_parking_allowed_availability ALTER time SET NOT NULL;

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
