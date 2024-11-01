-- Create the 'reservations' table
CREATE TABLE IF NOT EXISTS reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parking_space_id UUID NOT NULL,
    renter_id UUID NOT NULL,
    car_info_id UUID NOT NULL,
    start_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    end_time TIMESTAMP WITHOUT TIME ZONE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'booked', -- e.g., booked, canceled, completed, acknowledged
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (parking_space_id) REFERENCES parking_spaces(id) ON DELETE CASCADE,
    FOREIGN KEY (renter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (car_info_id) REFERENCES cars(id) ON DELETE CASCADE,
    CHECK (end_time > start_time)
);
