ALTER TABLE points_transaction
ADD COLUMN status VARCHAR(50) NOT NULL DEFAULT 'inactive'; -- 'active' or 'inactive'