import { test, expect } from '@playwright/test';

test('full smoke: home → today → session → results → dashboard', async ({ page }) => {
  // Add console logging
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

  await page.goto('/');
  await expect(page.getByText('Intellect Forge')).toBeVisible();
  await page.getByRole('link', { name: /start today/i }).click();
  await page.waitForSelector('button:has-text("Start session")', { timeout: 15_000 });
  await page.click('button:has-text("Start session")');
  await page.waitForURL(/\/session\//);
  // Run through trials — press Escape repeatedly to produce "no match" answers
  for (let i = 0; i < 200; i++) {
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    if (page.url().includes('/results/')) break;
    // Check for metacog prompt and submit if visible
    const promptCount = await page.locator('button:has-text("Submit prediction")').count();
    if (promptCount > 0) {
      await page.click('button:has-text("Submit prediction")');
    }
  }
  await page.waitForURL(/\/results\//, { timeout: 300_000 });
  await page.goto('/dashboard');
  await expect(page.getByText(/Domains/i)).toBeVisible();
  // Should show at least one session in recent list
  const sessions = page.locator('ul').nth(1).locator('li');
  await expect(sessions.first()).toBeVisible();
});
