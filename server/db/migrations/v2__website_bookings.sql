-- Active: 1785518158768@@127.0.0.1@5433@detailmaster_dev
-- Website Bookings — leads/inquiries submitted through the public booking form.
-- Backs client/src/pages/WebsiteBookings.jsx, which previously had no table/route at all.

CREATE TABLE website_bookings (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  car_make VARCHAR(100),
  car_model VARCHAR(100),
  service_interested VARCHAR(255),
  preferred_date TIMESTAMP,
  previous_preferred_date TIMESTAMP,
  notes TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_website_bookings_status ON website_bookings(status);
CREATE INDEX idx_website_bookings_is_deleted ON website_bookings(is_deleted);
