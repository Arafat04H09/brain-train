import { test, expect } from '@playwright/test';

test('phase 2 smoke: run full session end-to-end with metacog', async ({ page }) => {
  // Add console logging
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

  await page.goto('/');
  await page.getByRole('link', { name: /start today/i }).click();
  await page.waitForSelector('button:has-text("Start session")', { timeout: 15_000 });
  await page.click('button:has-text("Start session")');
  await page.waitForURL(/\/session\//);
  // Metacog prompt appears first — click Submit
  await page.waitForSelector('button:has-text("Submit prediction")', { timeout: 10_000 });
  await page.click('button:has-text("Submit prediction")');
  // Press keys for up to 4 min, checking for metacog prompts between trials
  for (let i = 0; i < 800; i++) {
    const keys = ['a','s','k','l','ArrowLeft','ArrowRight','Escape'];
    await page.keyboard.press(keys[i % keys.length]!);
    await page.waitForTimeout(200);

    // Check if we've reached results page
    if (page.url().includes('/results/')) {
      console.log('Reached results page');
      break;
    }

    // Check for metacog prompt button and submit if visible
    const promptCount = await page.locator('button:has-text("Submit prediction")').count();
    if (promptCount > 0) {
      console.log(`Found metacog prompt at iteration ${i}`);
      await page.click('button:has-text("Submit prediction")');
    }
  }
  await page.waitForURL(/\/results\//, { timeout: 300_000 });
  await page.goto('/dashboard');
  await expect(page.getByText(/Domains/i)).toBeVisible();
});
