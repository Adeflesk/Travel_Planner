import { test, expect, generateTripData, API_URL } from './fixtures';

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

  test('should show template picker on step 1', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Journey' })).toBeVisible();

    // Step 1 — template picker
    await expect(authenticatedPage.getByText('Choose a template')).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /Simple/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /Air travel/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: /Road trip/i })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Use template' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: 'Start blank' })).toBeVisible();
  });

  test('should preview segment count when template is selected', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Clicking "Simple" shows preview text
    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await expect(authenticatedPage.getByText('1 seg', { exact: false })).toBeVisible();

    // Clicking "Air travel" shows different preview
    await authenticatedPage.getByRole('button', { name: /Air travel/i }).click();
    await expect(authenticatedPage.getByText('3 segs', { exact: false })).toBeVisible();
  });

  test('should advance to segment editor after selecting a template', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();

    // Step 2 — segment editor
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    // Details always visible in wizard (no "Show details" toggle)
    await expect(authenticatedPage.getByLabel('Start time')).toBeVisible();
    await expect(authenticatedPage.getByLabel('End time')).toBeVisible();
  });

  test('should advance to segment editor via Start blank', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: 'Start blank' }).click();

    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await expect(authenticatedPage.getByPlaceholder('Enter origin')).toBeVisible();
  });

  test('should navigate forward and backward between segments', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Air travel → 3 segments
    await authenticatedPage.getByRole('button', { name: /Air travel/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();
    await expect(authenticatedPage.getByText('1 / 3')).toBeVisible();

    // Forward
    await authenticatedPage.getByRole('button', { name: 'Next' }).click();
    await expect(authenticatedPage.getByText('2 / 3')).toBeVisible();

    await authenticatedPage.getByRole('button', { name: 'Next' }).click();
    await expect(authenticatedPage.getByText('3 / 3')).toBeVisible();

    // Last segment shows "Review"
    await expect(authenticatedPage.getByRole('button', { name: 'Review' })).toBeVisible();

    // Back
    await authenticatedPage.getByRole('button', { name: 'Previous' }).click();
    await expect(authenticatedPage.getByText('2 / 3')).toBeVisible();

    // Back to template from segment 1
    await authenticatedPage.getByRole('button', { name: 'Previous' }).click();
    await authenticatedPage.getByRole('button', { name: 'Template' }).click();
    await expect(authenticatedPage.getByText('Choose a template')).toBeVisible();
  });

  test('should show step bar and allow jumping between steps', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Start on step 1
    await expect(authenticatedPage.getByRole('button', { name: '1 Template' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: '2 Segments' })).toBeVisible();
    await expect(authenticatedPage.getByRole('button', { name: '3 Review' })).toBeVisible();

    // Advance to step 2
    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();

    // Use step bar to jump back to template
    await authenticatedPage.getByRole('button', { name: '1 Template' }).click();
    await expect(authenticatedPage.getByText('Choose a template')).toBeVisible();
  });

  test('should allow free text origin and destination', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: 'Start blank' }).click();

    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await authenticatedPage.getByPlaceholder('Enter origin').fill('My House');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Bus Station');

    await expect(authenticatedPage.getByPlaceholder('Enter origin')).toHaveValue('My House');
    await expect(authenticatedPage.getByPlaceholder('Enter destination')).toHaveValue('Bus Station');
  });

  test('should show transport option cards for TRANSFER segments', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Road trip pre-populates TRANSFER segments with Uber/Taxi options
    await authenticatedPage.getByRole('button', { name: /Road trip/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();

    await expect(authenticatedPage.getByText('🚗 Transport options')).toBeVisible();
    await expect(authenticatedPage.getByText('Drive (self)')).toBeVisible();
    await expect(authenticatedPage.getByText('Uber')).toBeVisible();

    // ⚡ Fastest badge should appear when multiple options exist
    await expect(authenticatedPage.getByText('⚡ Fastest')).toBeVisible();
  });

  test('should select a transport option card', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: /Road trip/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();

    await expect(authenticatedPage.getByText('🚗 Transport options')).toBeVisible();

    // Click the Uber card to select it
    await authenticatedPage.getByText('Uber').click();

    // Uber card should now show checkmark (be selected)
    const uberCard = authenticatedPage.locator('button', { hasText: 'Uber' }).first();
    await expect(uberCard).toContainText('✓');
  });

  test('should add a custom transport option', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: 'Start blank' }).click();
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();

    // Transport options section is visible for TRANSFER segment (default)
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
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();

    await authenticatedPage.getByPlaceholder('Enter origin').fill('Paris');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Lyon');

    // Advance to review
    await authenticatedPage.getByRole('button', { name: 'Review' }).click();

    await expect(authenticatedPage.getByText(/Review your journey/i)).toBeVisible();
    await expect(authenticatedPage.getByText(/Paris/)).toBeVisible();
    await expect(authenticatedPage.getByText(/Lyon/)).toBeVisible();

    // Edit button should jump back to segment editing
    await authenticatedPage.getByRole('button', { name: 'Edit' }).first().click();
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
  });

  test('should save a complete journey through the wizard', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Select transport mode (required)
    await authenticatedPage.locator('select').first().selectOption('TRANSFER');

    // Step 1: template
    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template' }).click();

    // Step 2: fill segment
    await expect(authenticatedPage.getByText('1 / 1')).toBeVisible();
    await authenticatedPage.getByPlaceholder('Enter origin').fill('Berlin');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Munich');

    // Step 3: review (via Review button)
    await authenticatedPage.getByRole('button', { name: 'Review' }).click();
    await expect(authenticatedPage.getByText(/Review your journey/i)).toBeVisible();

    // Save journey
    await authenticatedPage.getByRole('button', { name: 'Save Journey' }).click();

    // Journey appears in list
    await expect(authenticatedPage.locator('text=Berlin').first()).toBeVisible({ timeout: 10000 });
  });
});
