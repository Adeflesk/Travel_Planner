import { test, expect } from './fixtures';

test.describe('Settings Page Toggles', () => {
    test('can turn off all feature flags and have them persist on reload', async ({ authenticatedPage }) => {
        // Automatically accept any dialogs that appear
        authenticatedPage.on('dialog', dialog => dialog.accept());

        // Navigate straight to the settings page
        await authenticatedPage.goto('/settings');
        // Ensure the page has fully loaded
        await expect(authenticatedPage.locator('h1', { hasText: 'Settings' })).toBeVisible();

        authenticatedPage.on('request', req => {
            if (req.url().includes('/settings/') && req.method() === 'PATCH') {
                console.log('Sending PATCH Request Data:', req.postDataJSON());
            }
        });

        // Find all the toggle inputs. They are inside a label containing "Road Trip Builder" etc.
        const flagsToDisable = ['Road Trip Builder', 'Expense Tracking', 'Packing List'];

        // Force them all ON to establish a baseline
        for (const flagText of flagsToDisable) {
            const checkbox = authenticatedPage.locator(`label:has-text("${flagText}")`).locator('input[type="checkbox"]');
            const isChecked = await checkbox.isChecked();
            if (!isChecked) {
                await checkbox.check();
            }
        }

        // Save baseline and wait for the API response
        const savePromise = authenticatedPage.waitForResponse(response =>
            response.url().includes('/settings/') && response.request().method() === 'PATCH'
        );
        await authenticatedPage.getByRole('button', { name: 'Save Settings' }).click();
        await savePromise;

        // Wait for React to settle
        await authenticatedPage.waitForTimeout(1000);

        // Now perform the real test: Turn them all off
        for (const flagText of flagsToDisable) {
            const checkbox = authenticatedPage.locator(`label:has-text("${flagText}")`).locator('input[type="checkbox"]');
            await checkbox.uncheck();
            await expect(checkbox).not.toBeChecked(); // Assert it visibly unmatched
        }

        // Save
        const savePromise2 = authenticatedPage.waitForResponse(response =>
            response.url().includes('/settings/') && response.request().method() === 'PATCH'
        );
        await authenticatedPage.getByRole('button', { name: 'Save Settings' }).click();
        await savePromise2;
        await authenticatedPage.waitForTimeout(1000);

        // Reload the page aggressively
        await authenticatedPage.reload();
        await expect(authenticatedPage.locator('h1', { hasText: 'Settings' })).toBeVisible();

        authenticatedPage.on('response', resp => {
            if (resp.url().includes('/settings/') && resp.request().method() === 'PATCH') {
                console.log('PATCH Response status:', resp.status());
                resp.json().then(j => console.log('PATCH Response JSON:', j)).catch(() => { });
            }
            if (resp.url().includes('/settings/') && resp.request().method() === 'GET') {
                resp.json().then(j => console.log('GET Response JSON:', j)).catch(() => { });
            }
        });

        // Verify all checkboxes remain off
        for (const flagText of flagsToDisable) {
            const checkbox = authenticatedPage.locator(`label:has-text("${flagText}")`).locator('input[type="checkbox"]');
            await expect(checkbox).not.toBeChecked();
        }
    });
});
