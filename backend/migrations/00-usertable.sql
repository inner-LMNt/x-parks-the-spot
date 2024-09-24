CREATE TABLE users (
	id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	name text not null,
	password_hash text not null,
);
