import { test, expect, generateTripData, generateDestinationData, generateJourneyData, API_URL } from './fixtures';

test.describe('Journey Management', () => {
  let tripId: number;
  let originId: number;
  let destinationId: number;

  test.beforeEach(async ({ authApiRequest }) => {
    // Clean up existing trips
    const response = await authApiRequest('get', `${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }

    // Create a trip for journey tests
    const tripData = generateTripData({ name: 'Journey Test Trip' });
    const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(tripResponse.ok()).toBeTruthy();
    const trip = await tripResponse.json();
    tripId = trip.id;
    expect(tripId).toBeDefined();

    // Create two destinations for journey origin/destination
    const dest1 = generateDestinationData(tripId, { name: 'Paris', country: 'France' });
    const dest2 = generateDestinationData(tripId, { name: 'London', country: 'UK' });

    const dest1Response = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const dest2Response = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    expect(dest1Response.ok()).toBeTruthy();
    expect(dest2Response.ok()).toBeTruthy();

    originId = (await dest1Response.json()).id;
    destinationId = (await dest2Response.json()).id;
    expect(originId).toBeDefined();
    expect(destinationId).toBeDefined();
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

  test('should display empty state when no journeys exist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Navigate to Journeys tab
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    await expect(authenticatedPage.getByText('No journeys yet')).toBeVisible();
  });

  test('should create a new journey', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Navigate to Journeys tab
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Click "Add Journey" button to show the form
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();

    // Wait for the form to load
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Journey' })).toBeVisible();

    // Fill in the journey form - select transport mode
    await authenticatedPage.locator('select').first().selectOption('flight');
    await authenticatedPage.getByPlaceholder('e.g., British Airways, Eurostar').fill('British Airways');

    // Select origin and destination
    await authenticatedPage.locator('select').nth(1).selectOption(originId.toString());
    await authenticatedPage.locator('select').nth(2).selectOption(destinationId.toString());

    // Set cost
    await authenticatedPage.getByPlaceholder('0.00').fill('250');
    await authenticatedPage.getByPlaceholder('e.g., ABC123').fill('BA123');

    // Submit
    await authenticatedPage.getByRole('button', { name: /Add Journey/i }).click();

    // Verify journey appears - check for carrier in the list
    await expect(authenticatedPage.getByText('British Airways')).toBeVisible({ timeout: 10000 });
  });

  test('should display journey with transport icon', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      transport_mode: 'train',
      carrier: 'Eurostar',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Verify journey details with increased timeout
    await expect(authenticatedPage.getByText('Eurostar')).toBeVisible({ timeout: 15000 });
  });

  test('should edit a journey', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'Air France',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(authenticatedPage.getByText('Air France')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await authenticatedPage.locator('.space-y-3 button').filter({ has: authenticatedPage.locator('svg') }).first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Journey' })).toBeVisible();

    // Change carrier
    await authenticatedPage.getByPlaceholder('e.g., British Airways, Eurostar').fill('Lufthansa');

    // Save changes
    await authenticatedPage.getByRole('button', { name: /Update Journey/i }).click();

    // Verify updated journey
    await expect(authenticatedPage.getByText('Lufthansa')).toBeVisible({ timeout: 10000 });
  });

  test('should cancel editing a journey', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'Swiss Air',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(authenticatedPage.getByText('Swiss Air')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await authenticatedPage.locator('.space-y-3 button').filter({ has: authenticatedPage.locator('svg') }).first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Journey' })).toBeVisible();

    // Click cancel - use form-specific cancel button
    await authenticatedPage.locator('form').getByRole('button', { name: /Cancel/i }).click();

    // Verify form is hidden (heading should not be visible)
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Journey' })).not.toBeVisible();
  });

  test('should delete a journey', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'KLM',
    });
    await authApiRequest('post', `${API_URL}/journeys/`, journeyData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Verify journey exists
    await expect(authenticatedPage.getByText('KLM')).toBeVisible();

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Click delete button (the red button in the journey item)
    await authenticatedPage.locator('.space-y-3 button.text-red-600').first().click();

    // Verify journey is removed
    await expect(authenticatedPage.getByText('KLM')).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText('No journeys yet')).toBeVisible();
  });

  test('should display journey status', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey with booked status via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      status: 'booked',
      carrier: 'Ryanair',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load first
    await expect(authenticatedPage.getByText('Ryanair')).toBeVisible({ timeout: 15000 });

    // Verify status badge is shown (use specific locator to target status in journey list)
    await expect(authenticatedPage.locator('.space-y-3').getByText('Booked')).toBeVisible();
  });

  test('should display journey cost', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey with cost via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      cost: 199.99,
      carrier: 'EasyJet',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Verify cost is displayed with increased timeout
    await expect(authenticatedPage.getByText('199.99 USD')).toBeVisible({ timeout: 15000 });
  });

  test('should change journey status', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      status: 'planned',
      carrier: 'TAP',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(authenticatedPage.getByText('TAP')).toBeVisible({ timeout: 15000 });

    // Verify initially planned (use specific locator for journey list)
    await expect(authenticatedPage.locator('.space-y-3').getByText('Planned')).toBeVisible();

    // Edit journey using a more reliable selector
    await authenticatedPage.locator('.space-y-3 button').filter({ has: authenticatedPage.locator('svg') }).first().click();

    // Change status to booked using the status select in the form
    await authenticatedPage.locator('form select').last().selectOption('booked');

    // Save
    await authenticatedPage.getByRole('button', { name: /Update Journey/i }).click();

    // Verify status changed (use specific locator for journey list)
    await expect(authenticatedPage.locator('.space-y-3').getByText('Booked')).toBeVisible({ timeout: 10000 });
  });
});
