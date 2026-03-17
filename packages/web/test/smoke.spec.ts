import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

const uid = () => `smoke${Date.now()}${Math.random().toString(36).slice(2, 6)}`;

/** Register via the UI form. Waits for hydration before interacting. */
async function register(page: Page, username?: string, password = 'test1234') {
  const name = username ?? uid();
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const toggle = page.getByText("Don't have an account? Register");
  await toggle.click();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByLabel('Username').fill(name);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Logout' })).toBeVisible({ timeout: 10_000 });
  return { username: name, password };
}

/** Wait for SvelteKit hydration on login page. */
async function waitForHydration(page: Page) {
  await page.waitForLoadState('networkidle');
}

// --- Landing page ---

test('landing page shows title and play button', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('drop-coop')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Play now' })).toBeVisible();
});

test('play now navigates to login', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Play now' }).click();
  await expect(page).toHaveURL(/login/);
});

// --- Auth ---

test('register via form and land on dashboard', async ({ page }) => {
  await register(page);
  await expect(page.getByText('Welcome to your co-op')).toBeVisible();
});

test('login via form', async ({ page }) => {
  // Register first, then logout, then login
  const { username, password } = await register(page);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel('Username').fill(username);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
});

test('login with wrong password shows error', async ({ page }) => {
  const name = uid();
  await page.request.post('/api/auth/register', { data: { username: name, password: 'test1234' } });
  await page.goto('/login');
  await waitForHydration(page);
  await page.getByLabel('Username').fill(name);
  await page.getByLabel('Password').fill('wrongpassword');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByText(/invalid/i)).toBeVisible();
});

test('toggle between login and register forms', async ({ page }) => {
  await page.goto('/login');
  await waitForHydration(page);
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible({
    timeout: 10_000,
  });
  await page.getByText("Don't have an account? Register").click();
  await expect(page.getByRole('button', { name: 'Register', exact: true })).toBeVisible();
  await page.getByText('Already have an account? Login').click();
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
});

test('logout redirects to login', async ({ page }) => {
  await register(page);
  await page.getByRole('button', { name: 'Logout' }).click();
  await expect(page).toHaveURL(/login/);
});

test('auth guard redirects to login without token', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/login/);
});

// --- Dashboard ---

test('new player sees stats cards', async ({ page }) => {
  await register(page);
  await expect(page.getByText('💰 Money')).toBeVisible();
  await expect(page.getByText('⭐ Reputation')).toBeVisible();
  await expect(page.getByText('📦 Deliveries')).toBeVisible();
  await expect(page.getByText('🏍️ Fleet')).toBeVisible();
});

test('new player sees hire prompt', async ({ page }) => {
  await register(page);
  await expect(page.getByText('Hire your first rider')).toBeVisible();
});

// --- Riders ---

test('riders page shows empty state', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Riders' }).first().click();
  await expect(page.getByText('No riders yet')).toBeVisible();
});

test('hire a rider from pool', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Riders' }).first().click();
  await page.getByRole('button', { name: 'Browse hiring pool' }).click();
  await expect(page.getByText('Hiring Pool')).toBeVisible();
  const hireButtons = page.getByRole('button', { name: /^Hire €/ });
  await expect(hireButtons.first()).toBeVisible();
  await hireButtons.first().click();
  await expect(page.getByText('Energy')).toBeVisible();
  await expect(page.getByText('Morale')).toBeVisible();
});

test('toggle rider rest', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Riders' }).first().click();
  await page.getByRole('button', { name: 'Browse hiring pool' }).click();
  await page
    .getByRole('button', { name: /^Hire €/ })
    .first()
    .click();
  await expect(page.getByText('Energy')).toBeVisible();
  await page.getByRole('button', { name: '😴 Rest' }).click();
  await expect(page.getByText('😴 Resting')).toBeVisible();
  await page.getByRole('button', { name: '⏰ Wake' }).click();
  await expect(page.getByText('✅ Idle')).toBeVisible();
});

// --- Orders ---

test('orders page shows need riders message when no riders', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Orders' }).first().click();
  await expect(page.getByText('You need riders first')).toBeVisible();
});

// --- Zones ---

test('zones page shows Centro as active', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Zones' }).first().click();
  await expect(page.getByText('Cities & Zones')).toBeVisible();
  await expect(page.getByText('Centro')).toBeVisible();
  await expect(page.getByText('✅ Active').first()).toBeVisible();
});

test('zones page shows locked zones', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Zones' }).first().click();
  await expect(page.getByText('🔒').first()).toBeVisible();
});

// --- Leaderboard ---

test('leaderboard shows player and tabs', async ({ page }) => {
  await register(page);
  await page.goto('/dashboard/leaderboard');
  await expect(page.getByRole('button', { name: '🤖 Hacker' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: '🤖 Hacker' }).click();
  await expect(page.getByText('API users ranked by profit')).toBeVisible({ timeout: 5_000 });
  await page.getByRole('button', { name: '🔍 Explorer' }).click();
  await expect(page.getByText('Most API endpoints discovered')).toBeVisible({ timeout: 5_000 });
});

// --- Theme ---

test('theme toggle cycles through modes', async ({ page }) => {
  await register(page);
  const themeBtn = page.getByRole('button', { name: /☀️|🌙|💻/ });
  await expect(themeBtn).toBeVisible();
  const initial = await themeBtn.textContent();
  await themeBtn.click();
  await expect(themeBtn).not.toHaveText(initial ?? '');
});

// --- Navigation ---

test('navigate through all main pages', async ({ page }) => {
  await register(page);
  await expect(page.getByText('💰 Money')).toBeVisible();
  // Use heading text which is unique per page
  await page.getByRole('link', { name: 'Riders' }).first().click();
  await expect(page.locator('h2', { hasText: 'Riders' })).toBeVisible();
  await page.getByRole('link', { name: 'Orders' }).first().click();
  await expect(page.locator('h2', { hasText: 'Orders' })).toBeVisible();
  await page.getByRole('link', { name: 'Zones' }).first().click();
  await expect(page.locator('h2', { hasText: 'Zones' })).toBeVisible();
  await page.getByRole('link', { name: 'Board' }).first().click();
  await expect(page.getByText('Loading')).not.toBeVisible({ timeout: 10_000 });
  await page.getByRole('link', { name: 'drop-coop' }).click();
  await expect(page.getByText('💰 Money')).toBeVisible();
});

// --- Accessibility ---

test('a11y: landing page', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('a11y: login page', async ({ page }) => {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('a11y: dashboard', async ({ page }) => {
  await register(page);
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('a11y: riders page', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Riders' }).first().click();
  await expect(page.locator('h2', { hasText: 'Riders' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test('a11y: zones page', async ({ page }) => {
  await register(page);
  await page.getByRole('link', { name: 'Zones' }).first().click();
  await expect(page.locator('h2', { hasText: 'Zones' })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
