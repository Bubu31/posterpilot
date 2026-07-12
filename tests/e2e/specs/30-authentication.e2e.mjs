import { test, expect } from '../support/fixtures.mjs';
import { t } from '../support/i18n.mjs';

test.describe.serial('optional authentication guard', () => {
	test('enables authentication and rejects unauthenticated page and API access', async ({
		page
	}) => {
		await page.goto('/settings?tab=security');
		await expect(page.getByRole('heading', { level: 2, name: t('security_title') })).toBeVisible();
		await page.getByLabel(t('security_mode_enabled'), { exact: false }).check();
		await page.getByLabel(t('security_username')).fill('pilot');
		await page.getByLabel(t('security_password')).fill('cinematic-password');
		await page.getByRole('button', { name: t('settings_save') }).click();
		await expect(page.getByRole('status').filter({ hasText: t('settings_saved') })).toBeVisible();

		await page.reload();
		await page.getByRole('button', { name: t('auth_logout') }).click();
		await expect(page).toHaveURL(/\/login$/);
		const api = await page.request.get('/api/servers');
		expect(api.status()).toBe(401);
		expect(await api.json()).toEqual({ error: 'unauthorized' });

		await page.goto('/review?state=staged');
		await expect(page).toHaveURL(/\/login\?redirectTo=/);
	});

	test('preserves a safe redirect, reports an invalid login, then accepts valid credentials', async ({
		page
	}) => {
		await page.getByLabel(t('login_username')).fill('pilot');
		await page.getByLabel(t('login_password')).fill('wrong-password');
		await page.getByRole('button', { name: t('login_submit') }).click();
		await expect(page.getByRole('alert')).toContainText(t('login_error_invalid'));

		await page.getByLabel(t('login_password')).fill('cinematic-password');
		await page.getByRole('button', { name: t('login_submit') }).click();
		await expect(page).toHaveURL(/\/review\?state=staged$/);
		await expect(page.getByRole('heading', { level: 1, name: t('review_title') })).toBeVisible();
	});

	test('disables authentication without leaving the installation locked out', async ({ page }) => {
		await page.goto('/settings?tab=security');
		await page.getByLabel(t('security_mode_disabled'), { exact: false }).check();
		await page.getByRole('button', { name: t('settings_save') }).click();
		await expect(page.getByRole('status').filter({ hasText: t('settings_saved') })).toBeVisible();
		await page.request.post('/api/auth/logout');
		await page.context().clearCookies();
		await page.goto('/');
		await expect(page).toHaveURL(/\/$/);
		await expect(page.getByRole('heading', { level: 1, name: t('dashboard_title') })).toBeVisible();
	});
});
