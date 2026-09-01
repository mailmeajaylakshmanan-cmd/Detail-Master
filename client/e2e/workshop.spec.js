import { test, expect } from '@playwright/test';

test.describe('Workshop & Operational E2E Tests', () => {
  test('should verify Service Time Management executive ribbon & cards', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:5173/**', { timeout: 6000 }).catch(() => {});
    await page.goto('/service-time');
    await expect(page.locator('text=Service Time Management')).toBeVisible();
    await expect(page.locator('text=In Workshop')).toBeVisible();
  });

  test('should verify Assigned Offers quota progress cards', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    await page.waitForURL('http://localhost:5173/**', { timeout: 6000 }).catch(() => {});
    await page.goto('/assigned-offers');
    await expect(page.locator('text=Assigned Offers & Passes')).toBeVisible();
  });
});
