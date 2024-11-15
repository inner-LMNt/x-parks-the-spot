CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reservation_id UUID REFERENCES reservations(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    type VARCHAR(100) NOT NULL DEFAULT 'Other' CHECK (type IN ('Other', 'Technical', 'Billing')),
    status VARCHAR(50) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
    admin_response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
