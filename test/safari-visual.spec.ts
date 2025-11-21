import { test, expect } from '@playwright/test';

test('safari visual test', async ({ page }) => {
  // Navigate to the page you want to test
  await page.goto('http://localhost:3000/teacher/rubrics/new');

  // You can add assertions here to make sure the page is loaded correctly
  // For example, wait for the main content to be visible
  await expect(page.locator('main')).toBeVisible();

  // Take a screenshot and save it to the project root
  await page.screenshot({ path: 'safari-screenshot.png', fullPage: true });
  console.log('Screenshot saved to safari-screenshot.png');

  // Pause the test to allow manual inspection
  // The test will resume after you close the browser window
  await page.pause();
});
