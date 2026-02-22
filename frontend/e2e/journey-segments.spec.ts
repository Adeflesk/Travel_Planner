import { test, expect, generateTripData, API_URL } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('Journey Segment Wizard', () => {
  let tripId: number;

  test.beforeEach(async ({ authApiRequest }) => {
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }
    const tripData = generateTripData({ name: 'Segment Wizard E2E' });
    const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(tripResponse.ok()).toBeTruthy();
    tripId = (await tripResponse.json()).id;
  });

  /** Helper: open the Add Journey wizard */
  async function openWizard(page: Page) {
    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();
    await page.getByRole('button', { name: 'Add Journey' }).click();
    await expect(page.getByRole('heading', { name: 'Add Journey' })).toBeVisible();
  }

  /** Helper: footer "Next →" button — the forward navigation button in the wizard footer */
  function nextBtn(page: Page) {
    // The footer next button has aria text containing "Next". Use getByRole to avoid matching
    // the "+ Segment" toolbar button.
    return page.getByRole('button', { name: /^Next/ });
  }

  /** Helper: footer "Review →" button */
  function reviewBtn(page: Page) {
    return page.getByRole('button', { name: /^Review/ });
  }

  /** Helper: footer back button ("← Template" or "← Previous" or just "Template"/"Previous") */
  function prevBtn(page: Page) {
    return page.getByRole('button', { name: /^(Template|Previous)$/ });
  }

  test('should show template picker on step 1', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Step 1 — template picker header
    await expect(authenticatedPage.getByText('Build your route')).toBeVisible();
    await expect(authenticatedPage.getByText(/Choose a template/i)).toBeVisible();

    // Template option cards are present (text inside buttons)
    await expect(authenticatedPage.getByText('Simple', { exact: true })).toBeVisible();
    await expect(authenticatedPage.getByText('Air travel', { exact: true })).toBeVisible();
    await expect(authenticatedPage.getByText('Road trip', { exact: true })).toBeVisible();

    // Footer buttons
    await expect(authenticatedPage.getByRole('button', { name: /Use template/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Start blank' })).toBeVisible();
  });

  test('should preview segment count when template is selected', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Clicking "Simple" card selects it (radio circle fills)
    await authenticatedPage.getByText('Simple', { exact: true }).click();
    // RouteChain shows "1 seg" after selection — scoped to the wizard area
    await expect(authenticatedPage.locator('.grid').getByText('1 seg')).toBeVisible();

    // Clicking "Air travel" shows 3 segments in the route chain
    await authenticatedPage.getByText('Air travel', { exact: true }).click();
    // "3 segs" appears in the selected card's RouteChain
    await expect(authenticatedPage.locator('.grid').getByText('3 segs').first()).toBeVisible();
  });

  test('should advance to segment editor after selecting a template', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    await authenticatedPage.getByText('Simple', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();

    // Step 2 — segment editor: progress indicator shows "1 / 1"
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Enter origin')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Enter destination')).toBeVisible();
  });

  test('should advance to segment editor via Start blank', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    await authenticatedPage.getByRole('button', { name: 'Start blank' }).click();

    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Enter origin')).toBeVisible();
  });

  test('should navigate forward and backward between segments', async ({ authenticatedPage }) => {
    test.setTimeout(60000); // longer timeout for multi-click navigation
    await openWizard(authenticatedPage);

    // Air travel → 3 segments
    await authenticatedPage.getByText('Air travel', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();
    await expect(authenticatedPage.getByText('1 / 3')).toBeVisible();

    // Forward via footer Next button
    await nextBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText('2 / 3')).toBeVisible();

    await nextBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText('3 / 3')).toBeVisible();

    // Last segment shows "Review →" in footer
    await expect(reviewBtn(authenticatedPage)).toBeVisible();

    // Back to segment 2
    await prevBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText('2 / 3')).toBeVisible();

    // Back to segment 1
    await prevBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText('1 / 3')).toBeVisible();

    // "← Template" button from segment 1 goes back to template step
    await prevBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText('Build your route')).toBeVisible();
  });

  test('should show step bar and allow jumping between steps', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // StepIndicator renders "Template", "Segments", "Review" labels (visible on sm+)
    // Verify the step indicator is present by checking the hidden-sm labels
    await expect(authenticatedPage.getByText('Template').first()).toBeVisible();

    // Advance to step 2
    await authenticatedPage.getByText('Simple', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();

    // Use step indicator "Template" label to jump back to step 1
    await authenticatedPage.getByText('Template').first().click();
    await expect(authenticatedPage.getByText('Build your route')).toBeVisible();
  });

  test('should allow free text origin and destination', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    await authenticatedPage.getByRole('button', { name: 'Start blank' }).click();

    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await authenticatedPage.getByPlaceholder('Enter origin').fill('My House');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Bus Station');

    await expect(authenticatedPage.getByPlaceholder('Enter origin')).toHaveValue('My House');
    await expect(authenticatedPage.getByPlaceholder('Enter destination')).toHaveValue('Bus Station');
  });

  test('should show transport option cards for TRANSFER segments', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Road trip template creates a TRANSFER segment as first leg
    await authenticatedPage.getByText('Road trip', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();
    await expect(authenticatedPage.getByText('1 / 5')).toBeVisible();

    // TRANSFER segment shows transport option cards
    await expect(authenticatedPage.getByText('🚗 Transport options')).toBeVisible();
    await expect(authenticatedPage.getByText('Drive (self)')).toBeVisible();
    await expect(authenticatedPage.getByText('Uber')).toBeVisible();

    // ⚡ Fastest badge should appear when multiple options exist
    await expect(authenticatedPage.getByText('⚡ Fastest')).toBeVisible();
  });

  test('should select a transport option card', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Road trip → single TRANSFER segment with transport options
    await authenticatedPage.getByText('Road trip', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();
    await expect(authenticatedPage.getByText('1 / 5')).toBeVisible();
    await expect(authenticatedPage.getByText('🚗 Transport options')).toBeVisible();

    // Click the Uber card to select it
    await authenticatedPage.getByText('Uber').click();

    // Uber card should now show checkmark (be selected)
    const uberCard = authenticatedPage.locator('button', { hasText: 'Uber' }).first();
    await expect(uberCard).toContainText('✓');
  });

  test('should add a custom transport option', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Road trip → first segment is TRANSFER
    await authenticatedPage.getByText('Road trip', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();
    await expect(authenticatedPage.getByText('1 / 5')).toBeVisible();

    // Transport options section is visible for TRANSFER segment
    await expect(authenticatedPage.getByText('🚗 Transport options')).toBeVisible();
    await authenticatedPage.getByText('+ Add option').click();

    // Fill in the new option form
    await authenticatedPage.getByLabel('Name').fill('Train');
    await authenticatedPage.getByLabel('Duration (min)').fill('45');
    await authenticatedPage.getByLabel('Est. cost').fill('25');
    await authenticatedPage.getByRole('button', { name: 'Add' }).click();

    // Option card should now appear
    await expect(authenticatedPage.getByText('Train')).toBeVisible();
  });

  test('should show review step with segment summary', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    await authenticatedPage.getByText('Simple', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();

    await authenticatedPage.getByPlaceholder('Enter origin').fill('Paris');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Lyon');

    // Advance to review via footer Review button
    await reviewBtn(authenticatedPage).click();

    await expect(authenticatedPage.getByText(/Review your journey/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Paris/)).toBeVisible();
    await expect(authenticatedPage.getByText(/Lyon/)).toBeVisible();

    // Edit button should jump back to segment editing
    await authenticatedPage.getByRole('button', { name: 'Edit' }).first().click();
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
  });

  test('should save a complete journey through the wizard', async ({ authenticatedPage }) => {
    await openWizard(authenticatedPage);

    // Step 1: select template
    await authenticatedPage.getByText('Simple', { exact: true }).click();
    await authenticatedPage.getByRole('button', { name: /Use template/i }).click();

    // Step 2: fill segment
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await authenticatedPage.getByPlaceholder('Enter origin').fill('Berlin');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Munich');

    // Step 3: review via footer Review button
    await reviewBtn(authenticatedPage).click();
    await expect(authenticatedPage.getByText(/Review your journey/i)).toBeVisible();

    // Save journey
    await authenticatedPage.getByRole('button', { name: 'Save Journey' }).click();

    // Journey appears in list
    await expect(authenticatedPage.locator('text=Berlin').first()).toBeVisible({ timeout: 10000 });
  });
});
