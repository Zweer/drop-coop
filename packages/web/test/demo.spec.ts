import { expect, type Page, test } from '@playwright/test';

import { CURSOR_SCRIPT } from './demo-cursor.ts';

const PAUSE = 800;
const SHORT = 400;

/** Move mouse to element center, pause, then click. */
async function demoClick(page: Page, selector: string, opts?: { timeout?: number }) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: opts?.timeout ?? 10_000 });
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await page.waitForTimeout(SHORT);
  }
  await el.click();
  await page.waitForTimeout(PAUSE);
}

/** Move mouse to element and hover (no click). */
async function demoHover(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 10_000 });
  const box = await el.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
    await page.waitForTimeout(PAUSE);
  }
}

test('drop-coop full demo walkthrough', async ({ page }) => {
  // Inject visible cursor
  await page.addInitScript(CURSOR_SCRIPT);

  // ===== 1. Landing page =====
  await page.goto('/');
  await page.waitForTimeout(1500);
  await demoClick(page, 'a:has-text("Play now")');

  // ===== 2. Register =====
  await page.waitForLoadState('networkidle');
  await demoClick(page, "text=Don't have an account? Register");
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible({
    timeout: 10_000,
  });

  const username = `demo${Date.now()}`;
  await demoClick(page, '[id="username"]');
  await page.keyboard.type(username, { delay: 50 });
  await page.waitForTimeout(SHORT);

  await demoClick(page, '[id="password"]');
  await page.keyboard.type('demo1234', { delay: 50 });
  await page.waitForTimeout(SHORT);

  await demoClick(page, 'button:has-text("Register")');
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  await page.waitForTimeout(1500);

  // ===== 3. Dashboard — show welcome + onboarding =====
  await expect(page.getByText('Getting Started')).toBeVisible({ timeout: 10_000 });
  await demoHover(page, 'text=Getting Started');
  await page.waitForTimeout(1000);

  // ===== 4. Hire a rider =====
  await demoClick(page, 'a:has-text("Riders")');
  await page.waitForTimeout(PAUSE);

  await demoClick(page, 'button:has-text("Browse hiring pool")');
  await page.waitForTimeout(1000);

  // Hire first candidate
  await demoClick(page, 'button:has-text("Hire")');
  await page.waitForTimeout(1500); // Wait for toast

  // ===== 5. Go to Orders =====
  await demoClick(page, 'a:has-text("Orders")');
  await page.waitForTimeout(1000);

  // Try to assign if there are available orders and an assign button
  const assignBtn = page.locator('button:has-text("Assign")').first();
  if (await assignBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await demoClick(page, 'button:has-text("Assign")');
    await page.waitForTimeout(1500);
  }

  // ===== 6. Zones page =====
  await demoClick(page, 'a:has-text("Zones")');
  await page.waitForTimeout(1000);

  // Hover over city sections
  const cityCard = page.locator('.space-y-6 > div').first();
  if (await cityCard.isVisible({ timeout: 3000 }).catch(() => false)) {
    await demoHover(page, '.space-y-6 > div >> nth=0');
    await page.waitForTimeout(PAUSE);
  }

  // ===== 7. Achievements page =====
  await demoClick(page, 'a:has-text("Badges")');
  await page.waitForTimeout(1000);

  // Hover over some achievements
  await demoHover(page, '[class*="card"] >> nth=0');
  await page.waitForTimeout(PAUSE);
  await demoHover(page, '[class*="card"] >> nth=1');
  await page.waitForTimeout(PAUSE);

  // ===== 8. Leaderboard =====
  await demoClick(page, 'a:has-text("Board")');
  await page.waitForTimeout(1000);

  // Click through tabs
  const hackerTab = page.locator('button:has-text("Hacker")');
  if (await hackerTab.isVisible({ timeout: 2000 }).catch(() => false)) {
    await demoClick(page, 'button:has-text("Hacker")');
    await page.waitForTimeout(PAUSE);
    await demoClick(page, 'button:has-text("Explorer")');
    await page.waitForTimeout(PAUSE);
  }

  // ===== 9. Back to dashboard =====
  await demoClick(page, 'a:has-text("Dashboard")');
  await page.waitForTimeout(1000);

  // Show stats
  await demoHover(page, 'text=Money');
  await page.waitForTimeout(PAUSE);

  // ===== 10. Theme toggle =====
  const themeBtn = page
    .locator('button:has-text("💻"), button:has-text("☀️"), button:has-text("🌙")')
    .first();
  if (await themeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await demoClick(page, 'button:has-text("💻"), button:has-text("☀️"), button:has-text("🌙")');
    await page.waitForTimeout(1000);
    await demoClick(page, 'button:has-text("💻"), button:has-text("☀️"), button:has-text("🌙")');
    await page.waitForTimeout(1000);
  }

  // ===== 11. Riders — show history =====
  await demoClick(page, 'a:has-text("Riders")');
  await page.waitForTimeout(PAUSE);

  const historyToggle = page.locator('button:has-text("Show history")').first();
  if (await historyToggle.isVisible({ timeout: 3000 }).catch(() => false)) {
    await demoClick(page, 'button:has-text("Show history")');
    await page.waitForTimeout(1000);
  }

  // ===== Final pause =====
  await page.waitForTimeout(2000);
});
