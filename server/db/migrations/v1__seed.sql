-- Minimal local dev seed data — creates one working admin login.
-- Login with: username "admin", password "admin123"

INSERT INTO roles (role_name, permissions) VALUES
  ('Super Admin', '{}'::jsonb);

INSERT INTO admin_users (username, email, password_hash, role_id, is_active) VALUES
  ('admin', 'admin@example.com', '$2a$10$wlA8if.goTf5ZUc2BpX9Ouj410xpybEuWjulwpP0fwpRd/e.wynvu', 1, TRUE);

-- Top-level menus (matches manage.detailingmasters.in nav bar)
-- icon values must match the kebab-case keys in client/src/components/Layout.jsx's iconMap
INSERT INTO menus (parent_id, menu_name, route_path, icon, sort_order) VALUES
  (NULL, 'Dashboard', '/', 'layout-dashboard', 1),
  (NULL, 'Masters', NULL, 'database', 2),
  (NULL, 'Billing & Records', '/invoices', 'file-text', 3),
  (NULL, 'Web Bookings', '/website-bookings', 'globe', 4),
  (NULL, 'Permissions', '/menu-assignment', 'shield', 5);

-- Sub-items under "Masters"
INSERT INTO menus (parent_id, menu_name, route_path, icon, sort_order)
SELECT id, 'Customers', '/master-customer', 'users', 1 FROM menus WHERE menu_name = 'Masters'
UNION ALL
SELECT id, 'Offers', '/master-offer', 'gift', 2 FROM menus WHERE menu_name = 'Masters'
UNION ALL
SELECT id, 'Services', '/master-service', 'sparkle', 3 FROM menus WHERE menu_name = 'Masters';
