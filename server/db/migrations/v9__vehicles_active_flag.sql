-- Organization vehicles become a proper managed sub-list (add/edit/deactivate)
-- instead of ad-hoc per-invoice entry. is_active lets staff retire a vehicle
-- from the picker without ever deleting a row that has invoice history.
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
