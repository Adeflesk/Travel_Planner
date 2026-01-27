import { test, expect, generateTripData, generateDestinationData } from './fixtures';

const API_URL = 'http://localhost:8000';

test.describe('Destination Management', () => {
  let tripId: number;

  test.beforeEach(async ({ request }) => {
    // Clean up existing trips
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }

    // Create a trip for destination tests
    const tripData = generateTripData({ name: 'Destination Test Trip' });
    const tripResponse = await request.post(`${API_URL}/trips/`, { data: tripData });
    expect(tripResponse.ok()).toBeTruthy();
    const trip = await tripResponse.json();
    tripId = trip.id;
    expect(tripId).toBeDefined();
  });

  test.afterEach(async ({ request }) => {
    // Clean up all trips
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }
  });

  test('should display empty state when no destinations exist', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);
    await expect(page.getByText('No destinations yet')).toBeVisible();
  });

  test('should create a new destination', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Fill in the destination form
    await page.getByPlaceholder('e.g., Paris, Tokyo').fill('Paris');
    await page.getByPlaceholder('e.g., France, Japan').fill('France');
    await page.getByPlaceholder('e.g., Île-de-France, Kanto').fill('Ile-de-France');

    // Set dates
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const departureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    await page.locator('input[type="date"]').first().fill(arrivalDate.toISOString().split('T')[0]);
    await page.locator('input[type="date"]').last().fill(departureDate.toISOString().split('T')[0]);

    // Submit
    await page.getByRole('button', { name: /Add Destination/i }).click();

    // Verify destination appears in the list (outside the form)
    await expect(page.locator('.space-y-3').getByText('Paris')).toBeVisible({ timeout: 10000 });
  });

  test('should display destination details', async ({ page, request }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'London',
      country: 'UK',
      region: 'England',
    });
    await request.post(`${API_URL}/destinations/`, { data: destData });

    await page.goto(`/trips/${tripId}`);

    // Verify destination details
    await expect(page.getByText('London')).toBeVisible();
    await expect(page.getByText(/UK/)).toBeVisible();
  });

  test('should edit a destination', async ({ page, request }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Barcelona',
      country: 'Spain',
    });
    const response = await request.post(`${API_URL}/destinations/`, { data: destData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);

    // Wait for destination to load with increased timeout
    await expect(page.getByText('Barcelona')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Destination' })).toBeVisible();

    // Change the name
    await page.getByPlaceholder('e.g., Paris, Tokyo').fill('Madrid');

    // Save changes
    await page.getByRole('button', { name: /Update Destination/i }).click();

    // Verify updated destination
    await expect(page.getByText('Madrid')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Barcelona')).not.toBeVisible();
  });

  test('should cancel editing a destination', async ({ page, request }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Rome',
      country: 'Italy',
    });
    const response = await request.post(`${API_URL}/destinations/`, { data: destData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);

    // Wait for destination to load with increased timeout
    await expect(page.getByText('Rome')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Destination' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode (check the heading specifically)
    await expect(page.getByRole('heading', { name: 'Add Destination' })).toBeVisible();
  });

  test('should delete a destination', async ({ page, request }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Amsterdam',
      country: 'Netherlands',
    });
    const response = await request.post(`${API_URL}/destinations/`, { data: destData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);

    // Verify destination exists with increased timeout
    await expect(page.getByText('Amsterdam')).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button using a more reliable selector (second button in the row)
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).nth(1).click();

    // Verify destination is removed
    await expect(page.getByText('Amsterdam')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No destinations yet')).toBeVisible();
  });

  test('should display multiple destinations', async ({ page, request }) => {
    // Create multiple destinations via API
    const dest1 = generateDestinationData(tripId, { name: 'Vienna', country: 'Austria' });
    const dest2 = generateDestinationData(tripId, { name: 'Prague', country: 'Czech Republic' });
    const dest3 = generateDestinationData(tripId, { name: 'Budapest', country: 'Hungary' });

    const resp1 = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const resp2 = await request.post(`${API_URL}/destinations/`, { data: dest2 });
    const resp3 = await request.post(`${API_URL}/destinations/`, { data: dest3 });
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();
    expect(resp3.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);

    // Verify all destinations are displayed with increased timeout
    await expect(page.getByText('Vienna')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Prague')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Budapest')).toBeVisible({ timeout: 15000 });
  });

  test('should expand and show activities section', async ({ page, request }) => {
    // Create destination via API
    const destData = generateDestinationData(tripId, {
      name: 'Berlin',
      country: 'Germany',
    });
    await request.post(`${API_URL}/destinations/`, { data: destData });

    await page.goto(`/trips/${tripId}`);

    // Click to expand activities
    await page.getByText('Show Activities').click();

    // Verify activities section is visible
    await expect(page.getByText('Hide Activities')).toBeVisible();

    // Collapse again
    await page.getByText('Hide Activities').click();
    await expect(page.getByText('Show Activities')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Try to submit without filling required fields
    await page.getByRole('button', { name: /Add Destination/i }).click();

    // Form should still show add mode (check the heading specifically)
    await expect(page.getByRole('heading', { name: 'Add Destination' })).toBeVisible();
  });
});
