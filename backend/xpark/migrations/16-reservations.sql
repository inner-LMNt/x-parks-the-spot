ALTER TABLE reservations
ADD COLUMN acknowledged BOOLEAN NOT NULL DEFAULT false;
