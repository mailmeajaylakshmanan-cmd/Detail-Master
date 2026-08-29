-- v22: Add vehicle_number column to web_bookings table
ALTER TABLE web_bookings ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(100);
