-- First, let's drop both existing foreign key constraints
ALTER TABLE paid_parking_allowed_availability
DROP CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey,
DROP CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey1;

-- Then create a single foreign key constraint with CASCADE
ALTER TABLE paid_parking_allowed_availability
ADD CONSTRAINT paid_parking_allowed_availability_parking_space_id_fkey
FOREIGN KEY (parking_space_id)
REFERENCES parking_spaces(id)
ON DELETE CASCADE;