UPDATE parking_spaces SET price = floor(price * 100)::integer;
ALTER TABLE parking_spaces ALTER price TYPE integer;
UPDATE reservations SET price = floor(price * 100)::integer;
ALTER TABLE reservations ALTER price TYPE integer;
ALTER TABLE reservations ADD COLUMN checkout_secret TEXT;
