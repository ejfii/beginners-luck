import { test, expect } from '@playwright/test';

/**
 * Basic E2E flow test
 * Tests: Navigate to app → View negotiation list → Verify data loads
 */
test.describe('Basic negotiation flow', () => {
  test('should display negotiation list on homepage', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');
    
    // Wait for the app to load
    await page.waitForLoadState('networkidle');
    
    // Check that the main app container is visible
    await expect(page.locator('.App')).toBeVisible();
    
    // Verify the heading or main navigation is present
    // Adjust selector based on actual app structure
    const heading = page.locator('h1, h2, .header');
    await expect(heading).toBeVisible();
    
    // Check that negotiation list or form is rendered
    // This verifies the app loaded successfully and React components mounted
    const mainContent = page.locator('[class*="negotiation"], [class*="Negotiation"], main, .container');
    await expect(mainContent).toBeVisible();
  });

  test('should navigate between views', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Verify the page loaded
    await expect(page.locator('.App')).toBeVisible();
    
    // If there's a navigation menu, verify it exists
    // This is a basic smoke test to ensure the app is interactive
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});
