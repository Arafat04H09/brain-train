import { test, expect } from '@playwright/test';

test('OPFS SQLite init + insert + query round-trip', async ({ page }) => {
  await page.goto('/');

  // Add console logging to see any errors
  page.on('console', msg => console.log(`[${msg.type()}] ${msg.text()}`));

  const result = await page.evaluate(async () => {
    // Import the db-client module - use URL relative to the app
    // @ts-ignore - dynamic import from browser context
    const dbModule = await import('/src/core/storage/db-client.ts');
    const { dbInit, dbExec, dbQuery } = dbModule as any;

    // Initialize the database
    await dbInit();

    // Clean up any existing test record
    await dbExec('DELETE FROM sessions WHERE id = ?', ['s1']);

    // Insert a test session
    await dbExec(
      'INSERT INTO sessions(id, start_ts, plan_json, phase) VALUES(?,?,?,?)',
      ['s1', Date.now(), '{}', 'ramp']
    );

    // Query back the inserted session
    const rows: any = await dbQuery('SELECT id FROM sessions WHERE id = ?', ['s1']);
    return rows.map((r: any) => r.id);
  });

  expect(result).toEqual(['s1']);
});
