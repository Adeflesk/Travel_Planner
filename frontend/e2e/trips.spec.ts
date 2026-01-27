import { test, expect, generateTripData } from './fixtures';

const API_URL = 'http://localhost:8000';

test.describe('Trip Management', () => {
  test.beforeEach(async ({ request }) => {
    // Clean up all trips before each test
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }
  });

  test.afterEach(async ({ request }) => {
    // Clean up all trips after each test
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }
  });

  test('should display empty state when no trips exist', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Your Trips')).toBeVisible();
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('should create a new trip', async ({ page }) => {
    await page.goto('/');

    // Click "New Trip" button
    await page.getByRole('button', { name: /New Trip/i }).click();

    // Fill in the form
    const tripData = generateTripData();
    await page.getByPlaceholder('e.g., Summer Europe Adventure').fill(tripData.name);
    await page.getByPlaceholder('e.g., 5000').fill(tripData.budget.toString());
    await page.locator('input[name="start_date"]').fill(tripData.start_date);
    await page.locator('input[name="end_date"]').fill(tripData.end_date);
    await page.getByPlaceholder('Describe your trip...').fill(tripData.description);

    // Handle the alert
    page.on('dialog', (dialog) => dialog.accept());

    // Submit the form
    await page.getByRole('button', { name: /Create Trip/i }).click();

    // Wait for the trip to appear in the list
    await expect(page.getByText(tripData.name)).toBeVisible({ timeout: 10000 });
  });

  test('should display trip details in the card', async ({ page, request }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Display Test Trip' });
    const response = await request.post(`${API_URL}/trips/`, { data: tripData });
    expect(response.ok()).toBeTruthy();

    await page.goto('/');

    // Verify trip card content with increased timeout
    await expect(page.getByText('Display Test Trip')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('planning')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to trip detail page when clicking a trip card', async ({
    page,
    request,
  }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Navigate Test Trip' });
    const response = await request.post(`${API_URL}/trips/`, { data: tripData });
    const trip = await response.json();

    await page.goto('/');

    // Click on the trip card
    await page.getByText('Navigate Test Trip').click();

    // Verify navigation to trip detail page
    await expect(page).toHaveURL(`/trips/${trip.id}`);
    await expect(page.getByText('Navigate Test Trip')).toBeVisible();
  });

  test('should delete a trip', async ({ page, request }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Delete Test Trip' });
    await request.post(`${API_URL}/trips/`, { data: tripData });

    await page.goto('/');

    // Verify trip exists
    await expect(page.getByText('Delete Test Trip')).toBeVisible();

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    await page.getByRole('button', { name: /Delete/i }).click();

    // Verify trip is removed
    await expect(page.getByText('Delete Test Trip')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No trips yet')).toBeVisible();
  });

  test('should navigate to edit page', async ({ page, request }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Edit Test Trip' });
    const response = await request.post(`${API_URL}/trips/`, { data: tripData });
    const trip = await response.json();

    await page.goto('/');

    // Click edit button
    await page.getByRole('button', { name: /Edit/i }).click();

    // Verify navigation to edit page
    await expect(page).toHaveURL(`/trips/${trip.id}/edit`);
  });

  test('should cancel trip creation form', async ({ page }) => {
    await page.goto('/');

    // Open form
    await page.getByRole('button', { name: /New Trip/i }).click();
    await expect(page.getByText('Create New Trip')).toBeVisible();

    // Cancel form
    await page.getByRole('button', { name: /Cancel/i }).click();
    await expect(page.getByText('Create New Trip')).not.toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /New Trip/i }).click();

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /Create Trip/i }).click();

    // Form should still be visible (not submitted due to HTML5 validation)
    await expect(page.getByText('Create New Trip')).toBeVisible();
  });

  test('should display multiple trips', async ({ page, request }) => {
    // Create multiple trips via API
    const trip1 = generateTripData({ name: 'Trip One' });
    const trip2 = generateTripData({ name: 'Trip Two' });
    const trip3 = generateTripData({ name: 'Trip Three' });

    await request.post(`${API_URL}/trips/`, { data: trip1 });
    await request.post(`${API_URL}/trips/`, { data: trip2 });
    await request.post(`${API_URL}/trips/`, { data: trip3 });

    await page.goto('/');

    // Verify all trips are displayed
    await expect(page.getByText('Trip One')).toBeVisible();
    await expect(page.getByText('Trip Two')).toBeVisible();
    await expect(page.getByText('Trip Three')).toBeVisible();
  });
});
