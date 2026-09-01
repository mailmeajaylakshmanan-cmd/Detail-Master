import { test, expect } from '@playwright/test';

test.describe('Workshop & Operational E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Mock specific API backend endpoints (strictly prefixed with /api/)
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          token: 'mock-jwt-token',
          csrfToken: 'mock-csrf-token',
          user: {
            id: 1,
            username: 'admin',
            role_name: 'Super Admin',
            permissions: ['*'],
            menus: [
              { id: 1, menu_name: 'Dashboard', route_path: '/' },
              { id: 2, menu_name: 'Service Time', route_path: '/service-time' },
              { id: 3, menu_name: 'Assigned Offers', route_path: '/assigned-offers' },
              { id: 4, menu_name: 'Customers', route_path: '/master-customer' },
              { id: 5, menu_name: 'Organizations', route_path: '/master-organization' },
            ],
          },
        }),
      });
    });

    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 1,
            username: 'admin',
            role_name: 'Super Admin',
            permissions: ['*'],
            menus: [
              { id: 1, menu_name: 'Dashboard', route_path: '/' },
              { id: 2, menu_name: 'Service Time', route_path: '/service-time' },
              { id: 3, menu_name: 'Assigned Offers', route_path: '/assigned-offers' },
              { id: 4, menu_name: 'Customers', route_path: '/master-customer' },
              { id: 5, menu_name: 'Organizations', route_path: '/master-organization' },
            ],
          },
          csrfToken: 'mock-csrf-token',
        }),
      });
    });

    await page.route('**/api/notifications**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/dashboard/stats**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ totalSales: 0, pendingCount: 0 }),
      });
    });

    await page.route('**/api/service-time/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            invoice_id: 1,
            invoice_vehicle_id: 1,
            invoice_number: 'INV-DM-001',
            client_name: 'Muthu Kumar',
            client_phone: '9843234567',
            make_model: 'Hyundai Creta',
            license_vin: 'TN 75 AS4343',
            checkin_time: new Date().toISOString(),
            checkout_time: null,
            services: [{ service_name: 'Full Body Wash', quantity: 1, completion_status: 'completed' }],
            third_party_services: [],
          },
        ]),
      });
    });

    await page.route('**/api/services**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/vehicle_types**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/vehicle-types**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/third_party_services**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/third-party-services**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/invoices**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          invoices: [
            {
              id: 1,
              invoice_number: 'INV-DM-001',
              client_name: 'Muthu Kumar',
              vehicle_name: 'Hyundai Creta',
              license_vin: 'TN 75 AS4343',
              status: 'open',
              grand_total: 2500,
              created_at: new Date().toISOString(),
              services: [{ service_name: 'Full Body Wash', unit_price: 2500, checkin_time: new Date().toISOString() }],
              vehicleVisits: [{ vehicle_id: 1, make_model: 'Hyundai Creta', license_vin: 'TN 75 AS4343', checkin_time: new Date().toISOString() }],
            },
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/offers**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            offerNo: 'OFF-001',
            customer: { name: 'Muthu Kumar', phone: '9843234567' },
            packageName: 'Premium 10-Wash Club',
            totalWashes: 10,
            completedWashes: 3,
            freeWashes: 2,
            freeWashesUsed: 1,
            status: 'active',
            validUntil: '2026-12-31',
            price: 2500,
          },
        ]),
      });
    });

    await page.route('**/api/assigned-offers**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.route('**/api/clients**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          clients: [
            {
              id: 1,
              name: 'Arun Prasath',
              phone: '9843234567',
              vehicles: [{ id: 1, make: 'Hyundai', model: 'i20', plate: 'TN74AB1234' }],
            },
          ],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
        }),
      });
    });

    await page.route('**/api/organizations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: 'Apex Fleet Logistics',
            contact_person: 'Rajesh Sharma',
            phone: '9876543210',
            vehicle_count: 12,
          },
        ]),
      });
    });

    // 2. Perform smooth login UI interaction and wait for successful login toast
    await page.goto('/login');
    await page.locator('input[type="text"]').fill('admin');
    await page.locator('input[type="password"]').fill('adminPassword');
    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Welcome back!')).toBeVisible({ timeout: 10000 });
  });

  test('should verify Service Time Management executive ribbon & cards', async ({ page }) => {
    await page.goto('/service-time');
    await expect(page.locator('h1')).toContainText('Service Time Management', { timeout: 10000 });
  });

  test('should verify Assigned Offers quota progress cards', async ({ page }) => {
    await page.goto('/assigned-offers');
    await expect(page.locator('h1')).toContainText('Assigned', { timeout: 10000 });
  });

  test('should verify Master Customers toolbar and filter', async ({ page }) => {
    await page.goto('/master-customer');
    await expect(page.locator('button:has-text("All Customers")')).toBeVisible({ timeout: 10000 });
  });

  test('should verify Master Organizations B2B fleet highlight strip', async ({ page }) => {
    await page.goto('/master-organization');
    await expect(page.locator('h1')).toContainText('Organization Master', { timeout: 10000 });
  });
});
