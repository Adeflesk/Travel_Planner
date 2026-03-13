import { test, expect, generateTripData, API_URL } from './fixtures';

test.describe('Trip Management', () => {
  test.beforeEach(async ({ authenticatedPage, authApiRequest }) => {
    // Clean up all trips before each test
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }

    // Navigate to trips page
    await authenticatedPage.goto('/trips');
  });

  test.afterEach(async ({ authApiRequest }) => {
    // Clean up all trips after each test
    try {
      const response = await authApiRequest('get', `${API_URL}/trips/`);
      if (response.ok()) {
        const trips = await response.json();
        for (const trip of trips) {
          await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
        }
      }
    } catch {
      // Ignore cleanup errors
    }
  });

  test('should display empty state when no trips exist', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.getByRole('heading', { name: 'Your Trips' })).toBeVisible();
    await expect(authenticatedPage.getByText(/No trips yet/)).toBeVisible();
  });

  test('should create a new trip', async ({ authenticatedPage }) => {
    // Click "New Trip" button
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();

    // Step 1: Basics
    const tripData = generateTripData();
    await authenticatedPage.getByLabel('Trip name').fill(tripData.name);
    await authenticatedPage.getByLabel('Start date').fill(tripData.start_date);
    await authenticatedPage.getByLabel('End date').fill(tripData.end_date);
    await authenticatedPage.getByLabel('Description (optional)').fill(tripData.description);
    await authenticatedPage.getByRole('button', { name: /Next Step/i }).click();

    // Step 2: Travellers
    await authenticatedPage.getByRole('button', { name: /Next Step/i }).click();

    // Step 3: Budget
    await authenticatedPage.getByLabel('Total budget').fill(tripData.budget.toString());

    // Handle the alert
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Submit the form
    await authenticatedPage.getByRole('button', { name: /Plan My Trip/i }).click();

    // Wait for the trip to appear in the list
    await expect(authenticatedPage.getByText(tripData.name)).toBeVisible({ timeout: 15000 });
  });

  test('should display trip details in the card', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Display Test Trip' });
    const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(response.ok()).toBeTruthy();

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Verify trip card content with increased timeout - use heading role for trip name
    await expect(authenticatedPage.getByRole('heading', { name: /Display Test Trip/ })).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByText('planning')).toBeVisible({ timeout: 15000 });
  });

  test('should navigate to trip detail page when clicking a trip card', async ({
    authenticatedPage,
    authApiRequest,
  }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Navigate Test Trip' });
    const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    const trip = await response.json();

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Click on the trip card (using the heading)
    await authenticatedPage.getByRole('heading', { name: /Navigate Test Trip/ }).click();

    // Verify navigation to trip detail page
    await expect(authenticatedPage).toHaveURL(`/trips/${trip.id}`);
    await expect(authenticatedPage.getByRole('heading', { name: /Navigate Test Trip/ })).toBeVisible();
  });

  test('should delete a trip', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Delete Test Trip' });
    await authApiRequest('post', `${API_URL}/trips/`, tripData);

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Verify trip exists
    await expect(authenticatedPage.getByRole('heading', { name: /Delete Test Trip/ })).toBeVisible();

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    await authenticatedPage.getByRole('button', { name: /Delete/i }).click();

    // Verify trip is removed
    await expect(authenticatedPage.getByRole('heading', { name: /Delete Test Trip/ })).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText(/No trips yet/)).toBeVisible();
  });

  test('should navigate to edit page', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Edit Test Trip' });
    const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    const trip = await response.json();

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Wait for the trip to appear
    await expect(authenticatedPage.getByRole('heading', { name: /Edit Test Trip/ })).toBeVisible({ timeout: 15000 });

    // Click edit button
    await authenticatedPage.getByRole('button', { name: /Edit/i }).click();

    // Verify navigation to edit page
    await expect(authenticatedPage).toHaveURL(`/trips/${trip.id}/edit`);
  });

  test('should cancel trip creation form', async ({ authenticatedPage }) => {
    // Open form
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();
    await expect(authenticatedPage.getByText('The Basics')).toBeVisible();

    // Cancel form - use the last Cancel button which should be in the wizard footer
    await authenticatedPage.getByRole('button', { name: /Cancel/i }).last().click();
    await expect(authenticatedPage.getByText('The Basics')).not.toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();

    // The Next Step button should be disabled initially
    const nextBtn = authenticatedPage.getByRole('button', { name: /Next Step/i });
    await expect(nextBtn).toBeDisabled();

    // Fill only name
    await authenticatedPage.getByLabel('Trip name').fill('Incomplete Trip');
    await expect(nextBtn).toBeDisabled();

    // Fill only dates
    await authenticatedPage.getByLabel('Trip name').clear();
    await authenticatedPage.getByLabel('Start date').fill('2026-01-01');
    await authenticatedPage.getByLabel('End date').fill('2026-01-10');
    await expect(nextBtn).toBeDisabled();

    // Fill all required fields
    await authenticatedPage.getByLabel('Trip name').fill('Complete Trip');
    await expect(nextBtn).toBeEnabled();
  });

  test('should display multiple trips', async ({ authenticatedPage, authApiRequest }) => {
    // Create multiple trips via API
    const trip1 = generateTripData({ name: 'Trip One' });
    const trip2 = generateTripData({ name: 'Trip Two' });
    const trip3 = generateTripData({ name: 'Trip Three' });

    await authApiRequest('post', `${API_URL}/trips/`, trip1);
    await authApiRequest('post', `${API_URL}/trips/`, trip2);
    await authApiRequest('post', `${API_URL}/trips/`, trip3);

    // Refresh the page to see the new trips
    await authenticatedPage.reload();

    // Verify all trips are displayed - use heading role
    await expect(authenticatedPage.getByRole('heading', { name: /Trip One/ })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /Trip Two/ })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /Trip Three/ })).toBeVisible();
  });
});
