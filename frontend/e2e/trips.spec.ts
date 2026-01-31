import { test, expect, generateTripData, API_URL } from './fixtures';

test.describe('Trip Management', () => {
  test.beforeEach(async ({ authApiRequest }) => {
    // Clean up all trips before each test
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }
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
    await expect(authenticatedPage.getByText('Your Trips')).toBeVisible();
    await expect(authenticatedPage.getByText('No trips yet')).toBeVisible();
  });

  test('should create a new trip', async ({ authenticatedPage }) => {
    // Click "New Trip" button
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();

    // Fill in the form
    const tripData = generateTripData();
    await authenticatedPage.getByPlaceholder('e.g., Summer Europe Adventure').fill(tripData.name);
    await authenticatedPage.getByPlaceholder('e.g., 5000').fill(tripData.budget.toString());
    await authenticatedPage.locator('input[name="start_date"]').fill(tripData.start_date);
    await authenticatedPage.locator('input[name="end_date"]').fill(tripData.end_date);
    await authenticatedPage.getByPlaceholder('Describe your trip...').fill(tripData.description);

    // Handle the alert
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Submit the form
    await authenticatedPage.getByRole('button', { name: /Create Trip/i }).click();

    // Wait for the trip to appear in the list
    await expect(authenticatedPage.getByText(tripData.name)).toBeVisible({ timeout: 10000 });
  });

  test('should display trip details in the card', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Display Test Trip' });
    const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(response.ok()).toBeTruthy();

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Verify trip card content with increased timeout
    await expect(authenticatedPage.getByText('Display Test Trip')).toBeVisible({ timeout: 15000 });
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

    // Click on the trip card
    await authenticatedPage.getByText('Navigate Test Trip').click();

    // Verify navigation to trip detail page
    await expect(authenticatedPage).toHaveURL(`/trips/${trip.id}`);
    await expect(authenticatedPage.getByText('Navigate Test Trip')).toBeVisible();
  });

  test('should delete a trip', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Delete Test Trip' });
    await authApiRequest('post', `${API_URL}/trips/`, tripData);

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Verify trip exists
    await expect(authenticatedPage.getByText('Delete Test Trip')).toBeVisible();

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    await authenticatedPage.getByRole('button', { name: /Delete/i }).click();

    // Verify trip is removed
    await expect(authenticatedPage.getByText('Delete Test Trip')).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText('No trips yet')).toBeVisible();
  });

  test('should navigate to edit page', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip via API
    const tripData = generateTripData({ name: 'Edit Test Trip' });
    const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    const trip = await response.json();

    // Refresh the page to see the new trip
    await authenticatedPage.reload();

    // Wait for the trip to appear
    await expect(authenticatedPage.getByText('Edit Test Trip')).toBeVisible({ timeout: 15000 });

    // Click edit button
    await authenticatedPage.getByRole('button', { name: /Edit/i }).click();

    // Verify navigation to edit page
    await expect(authenticatedPage).toHaveURL(`/trips/${trip.id}/edit`);
  });

  test('should cancel trip creation form', async ({ authenticatedPage }) => {
    // Open form
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();
    await expect(authenticatedPage.getByText('Create New Trip')).toBeVisible();

    // Cancel form
    await authenticatedPage.getByRole('button', { name: /Cancel/i }).click();
    await expect(authenticatedPage.getByText('Create New Trip')).not.toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.getByRole('button', { name: /New Trip/i }).click();

    // Try to submit without filling required fields
    await authenticatedPage.getByRole('button', { name: /Create Trip/i }).click();

    // Form should still be visible (not submitted due to HTML5 validation)
    await expect(authenticatedPage.getByText('Create New Trip')).toBeVisible();
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

    // Verify all trips are displayed
    await expect(authenticatedPage.getByText('Trip One')).toBeVisible();
    await expect(authenticatedPage.getByText('Trip Two')).toBeVisible();
    await expect(authenticatedPage.getByText('Trip Three')).toBeVisible();
  });
});
