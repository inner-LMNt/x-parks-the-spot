CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) NOT NULL, -- User who filed the dispute
    parking_space_id UUID REFERENCES parking_spaces(id), -- Optional parking space involved in the dispute
    dispute_type TEXT CHECK (dispute_type IN ('cancellation', 'complaint')) NOT NULL, -- Type of dispute
    message TEXT NOT NULL, -- Details of the dispute
    status TEXT CHECK (status IN ('pending', 'resolved')) DEFAULT 'pending', -- Current status of the dispute
    created_at TIMESTAMPTZ DEFAULT NOW()
);

