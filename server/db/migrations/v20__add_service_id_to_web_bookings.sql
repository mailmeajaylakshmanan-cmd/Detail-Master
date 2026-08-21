ALTER TABLE web_bookings ADD COLUMN IF NOT EXISTS service_id INTEGER REFERENCES services(id);
