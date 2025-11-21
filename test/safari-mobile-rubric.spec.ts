import { test, expect, devices } from '@playwright/test';

test.use({
  ...devices['iPhone 14 Pro'],
  browserName: 'webkit',
});

test.describe('Rubric AI Assistant on Safari Mobile', () => {
  test('should open AI Assistant and render correctly', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/auth/test-login');
    // Wait for redirect to teacher dashboard
    await page.waitForURL(/\/teacher/);

    // 2. Navigate to Rubric creation page
    await page.goto('http://localhost:3000/teacher/rubrics/new');

    // 3. Open AI Assistant
    // The button has a span with text "AI Generate Standards" inside it (sr-only)
    // It seems it renders in Chinese "AI 生成標準"
    const aiButton = page.getByRole('button', { name: /AI (Generate Standards|生成標準)/ });
    await expect(aiButton).toBeVisible();
    await aiButton.click();

    // 4. Verify AI Assistant is open
    // It opens in a Sheet.
    // Looking at AIRubricAssistant.tsx, it has an input with placeholder t('aiAssistant.placeholder')
    // English: "e.g., Personal statement rubric"
    // Chinese: "例如：個人簡述評分標準"
    const input = page.getByPlaceholder(/e\.g\., Personal statement rubric|例如：個人簡述評分標準/);
    await expect(input).toBeVisible();

    // 5. Take a screenshot to verify appearance
    await page.screenshot({ path: 'test-results/safari-mobile-rubric-assistant.png' });
  });
});
