import { test, expect } from '@playwright/test';

test.describe('Authentication & Diagnostics E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should render the luxury login screen correctly', async ({ page }) => {
    await expect(page.locator('text=Sign in to portal')).toBeVisible();
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error when fields are empty', async ({ page }) => {
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Please enter both username and password')).toBeVisible();
  });

  test('should show exact error for non-existent username', async ({ page }) => {
    await page.fill('input[type="text"]', 'unknown_user_999');
    await page.fill('input[type="password"]', 'anyPassword123');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=User account does not exist. Please check your username or email.')
    ).toBeVisible({ timeout: 8000 });
  });

  test('should show exact error for incorrect password', async ({ page }) => {
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'WrongPasswordXYZ');
    await page.click('button[type="submit"]');
    await expect(
      page.locator('text=Incorrect password. Please verify your password and try again.')
    ).toBeVisible({ timeout: 8000 });
  });
});
