import { test, expect } from '@playwright/test';

test.describe('Workshop & Operational E2E Tests', () => {
  test.beforeEach(async ({ context }) => {
    // Inject authenticated session into browser localStorage
    await context.addInitScript(() => {
      window.localStorage.setItem('isAuthenticated', 'true');
      window.localStorage.setItem('token', 'e2e-authenticated-token');
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          id: 1,
          username: 'admin',
          role_name: 'Super Admin',
          permissions: ['*'],
        })
      );
    });
  });

  test('should verify Service Time Management executive ribbon & cards', async ({ page }) => {
    await page.goto('/service-time');
    await expect(page.locator('text=Service Time Management')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=In Workshop')).toBeVisible();
  });

  test('should verify Assigned Offers quota progress cards', async ({ page }) => {
    await page.goto('/assigned-offers');
    await expect(page.locator('text=Assigned Passes')).toBeVisible({ timeout: 10000 });
  });

  test('should verify Master Customers toolbar and filter', async ({ page }) => {
    await page.goto('/master-customer');
    await expect(page.locator('text=All Customers')).toBeVisible({ timeout: 10000 });
  });

  test('should verify Master Organizations B2B fleet highlight strip', async ({ page }) => {
    await page.goto('/master-organization');
    await expect(page.locator('text=Corporate Clients')).toBeVisible({ timeout: 10000 });
  });
});
