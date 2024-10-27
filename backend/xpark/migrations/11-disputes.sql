ALTER TABLE disputes
ADD COLUMN reservation_id UUID REFERENCES reservations(id);
