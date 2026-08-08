ALTER TABLE web_bookings
  ADD COLUMN allocated_time VARCHAR(20),
  ADD COLUMN cancel_reason TEXT;
