import { test, expect, generateTripData, generateDestinationData, API_URL } from './fixtures';

test.describe('Destination Management', () => {
  let tripId: number;

  test.beforeEach(async ({ authApiRequest }) => {
    // Clean up existing trips
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }

    // Create a trip for destination tests
    const tripData = generateTripData({ name: 'Destination Test Trip' });
    const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(tripResponse.ok()).toBeTruthy();
    const trip = await tripResponse.json();
    tripId = trip.id;
    expect(tripId).toBeDefined();
  });

  test.afterEach(async ({ authApiRequest }) => {
    // Clean up all trips
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }
  });

  test('should display empty state when no destinations exist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await expect(authenticatedPage.getByText('No destinations yet')).toBeVisible();
  });

  test('should create a new destination', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Fill in the destination form
    await authenticatedPage.getByPlaceholder('e.g., Paris, Tokyo').fill('Paris');
    await authenticatedPage.getByPlaceholder('e.g., France, Japan').fill('France');
    await authenticatedPage.getByPlaceholder('e.g., Île-de-France, Kanto').fill('Ile-de-France');

    // Set dates
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const departureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    await authenticatedPage.locator('input[type="date"]').first().fill(arrivalDate.toISOString().split('T')[0]);
    await authenticatedPage.locator('input[type="date"]').last().fill(departureDate.toISOString().split('T')[0]);

    // Submit
    await authenticatedPage.getByRole('button', { name: /Add Destination/i }).click();

    // Verify destination appears in the list (outside the form)
    await expect(authenticatedPage.locator('.space-y-3').getByText('Paris')).toBeVisible({ timeout: 10000 });
  });

  test('should display destination details', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'London',
      country: 'UK',
      region: 'England',
    });
    await authApiRequest('post', `${API_URL}/destinations/`, destData);

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Verify destination details - use heading role for destination name
    await expect(authenticatedPage.getByRole('heading', { name: /London/ })).toBeVisible();
    await expect(authenticatedPage.getByRole('heading', { name: /UK/ })).toBeVisible();
  });

  test('should edit a destination', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Barcelona',
      country: 'Spain',
    });
    const response = await authApiRequest('post', `${API_URL}/destinations/`, destData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Wait for destination to load with increased timeout
    await expect(authenticatedPage.getByRole('heading', { name: /Barcelona/ })).toBeVisible({ timeout: 15000 });

    // Click edit button using aria-label
    await authenticatedPage.getByRole('button', { name: 'Edit destination' }).click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Destination' })).toBeVisible();

    // Change the name
    await authenticatedPage.getByPlaceholder('e.g., Paris, Tokyo').fill('Madrid');

    // Save changes
    await authenticatedPage.getByRole('button', { name: /Update Destination/i }).click();

    // Verify updated destination - use heading role
    await expect(authenticatedPage.getByRole('heading', { name: /Madrid/ })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByRole('heading', { name: /Barcelona/ })).not.toBeVisible();
  });

  test('should cancel editing a destination', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Rome',
      country: 'Italy',
    });
    const response = await authApiRequest('post', `${API_URL}/destinations/`, destData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Wait for destination to load with increased timeout
    await expect(authenticatedPage.getByRole('heading', { name: /Rome/ })).toBeVisible({ timeout: 15000 });

    // Click edit button using aria-label
    await authenticatedPage.getByRole('button', { name: 'Edit destination' }).click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Destination' })).toBeVisible();

    // Click cancel
    await authenticatedPage.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode (check the heading specifically)
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Destination' })).toBeVisible();
  });

  test('should delete a destination', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Amsterdam',
      country: 'Netherlands',
    });
    const response = await authApiRequest('post', `${API_URL}/destinations/`, destData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Verify destination exists with increased timeout
    await expect(authenticatedPage.getByRole('heading', { name: /Amsterdam/ })).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Click delete button using aria-label
    await authenticatedPage.getByRole('button', { name: 'Delete destination' }).click();

    // Verify destination is removed
    await expect(authenticatedPage.getByRole('heading', { name: /Amsterdam/ })).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText('No destinations yet')).toBeVisible();
  });

  test('should display multiple destinations', async ({ authenticatedPage, authApiRequest }) => {
    // Create multiple destinations via API
    const dest1 = generateDestinationData(tripId, { name: 'Vienna', country: 'Austria' });
    const dest2 = generateDestinationData(tripId, { name: 'Prague', country: 'Czech Republic' });
    const dest3 = generateDestinationData(tripId, { name: 'Budapest', country: 'Hungary' });

    const resp1 = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const resp2 = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    const resp3 = await authApiRequest('post', `${API_URL}/destinations/`, dest3);
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();
    expect(resp3.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Verify all destinations are displayed with increased timeout - use heading role
    await expect(authenticatedPage.getByRole('heading', { name: /Vienna/ })).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('heading', { name: /Prague/ })).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByRole('heading', { name: /Budapest/ })).toBeVisible({ timeout: 15000 });
  });

  test('should expand and show activities section', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Berlin',
      country: 'Germany',
    });
    await authApiRequest('post', `${API_URL}/destinations/`, destData);

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Click to expand activities
    await authenticatedPage.getByText('Show Activities').click();

    // Verify activities section is visible
    await expect(authenticatedPage.getByText('Hide Activities')).toBeVisible();

    // Collapse again
    await authenticatedPage.getByText('Hide Activities').click();
    await expect(authenticatedPage.getByText('Show Activities')).toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Try to submit without filling required fields
    await authenticatedPage.getByRole('button', { name: /Add Destination/i }).click();

    // Form should still show add mode (check the heading specifically)
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Destination' })).toBeVisible();
  });
});
