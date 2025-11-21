import { test as setup, expect } from '@playwright/test';

const authFile = 'test/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // This is a placeholder for the test-only login route
  // We will create this route in the next step.
  await page.goto('/auth/test-login');

  // Wait for the page to be redirected after login, e.g., to the dashboard.
  // Update this URL to your app's default logged-in page if it's different.
  await expect(page).toHaveURL(/.*dashboard/);

  // End of authentication steps.

  // The storage state will be saved by Playwright and used in subsequent tests.
  await page.context().storageState({ path: authFile });
});
