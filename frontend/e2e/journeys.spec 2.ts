import { test, expect, generateTripData, generateDestinationData, generateJourneyData } from './fixtures';

const API_URL = 'http://localhost:8000';

test.describe('Journey Management', () => {
  let tripId: number;
  let originId: number;
  let destinationId: number;

  test.beforeEach(async ({ request }) => {
    // Clean up existing trips
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }

    // Create a trip for journey tests
    const tripData = generateTripData({ name: 'Journey Test Trip' });
    const tripResponse = await request.post(`${API_URL}/trips/`, { data: tripData });
    expect(tripResponse.ok()).toBeTruthy();
    const trip = await tripResponse.json();
    tripId = trip.id;
    expect(tripId).toBeDefined();

    // Create two destinations for journey origin/destination
    const dest1 = generateDestinationData(tripId, { name: 'Paris', country: 'France' });
    const dest2 = generateDestinationData(tripId, { name: 'London', country: 'UK' });

    const dest1Response = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const dest2Response = await request.post(`${API_URL}/destinations/`, { data: dest2 });
    expect(dest1Response.ok()).toBeTruthy();
    expect(dest2Response.ok()).toBeTruthy();

    originId = (await dest1Response.json()).id;
    destinationId = (await dest2Response.json()).id;
    expect(originId).toBeDefined();
    expect(destinationId).toBeDefined();
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

  test('should display empty state when no journeys exist', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Navigate to Journeys tab
    await page.getByRole('button', { name: /Journeys/i }).click();

    await expect(page.getByText('No journeys yet')).toBeVisible();
  });

  test('should create a new journey', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Navigate to Journeys tab
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Wait for the form to load
    await expect(page.getByRole('heading', { name: 'Add Journey' })).toBeVisible();

    // Fill in the journey form - select transport mode
    await page.locator('select').first().selectOption('flight');
    await page.getByPlaceholder('e.g., British Airways, Eurostar').fill('British Airways');

    // Select origin and destination
    await page.locator('select').nth(1).selectOption(originId.toString());
    await page.locator('select').nth(2).selectOption(destinationId.toString());

    // Set cost
    await page.getByPlaceholder('0.00').fill('250');
    await page.getByPlaceholder('e.g., ABC123').fill('BA123');

    // Submit
    await page.getByRole('button', { name: /Add Journey/i }).click();

    // Verify journey appears - check for carrier in the list
    await expect(page.getByText('British Airways')).toBeVisible({ timeout: 10000 });
  });

  test('should display journey with transport icon', async ({ page, request }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      transport_mode: 'train',
      carrier: 'Eurostar',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Verify journey details with increased timeout
    await expect(page.getByText('Eurostar')).toBeVisible({ timeout: 15000 });
  });

  test('should edit a journey', async ({ page, request }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'Air France',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(page.getByText('Air France')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Journey' })).toBeVisible();

    // Change carrier
    await page.getByPlaceholder('e.g., British Airways, Eurostar').fill('Lufthansa');

    // Save changes
    await page.getByRole('button', { name: /Update Journey/i }).click();

    // Verify updated journey
    await expect(page.getByText('Lufthansa')).toBeVisible({ timeout: 10000 });
  });

  test('should cancel editing a journey', async ({ page, request }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'Swiss Air',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(page.getByText('Swiss Air')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Journey' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode
    await expect(page.getByRole('heading', { name: 'Add Journey' })).toBeVisible();
  });

  test('should delete a journey', async ({ page, request }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      carrier: 'KLM',
    });
    await request.post(`${API_URL}/journeys/`, { data: journeyData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Verify journey exists
    await expect(page.getByText('KLM')).toBeVisible();

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button
    await page.locator('button').filter({ has: page.locator('svg.lucide-trash-2') }).first().click();

    // Verify journey is removed
    await expect(page.getByText('KLM')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No journeys yet')).toBeVisible();
  });

  test('should display journey status', async ({ page, request }) => {
    // Create journey with booked status via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      status: 'booked',
      carrier: 'Ryanair',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load first
    await expect(page.getByText('Ryanair')).toBeVisible({ timeout: 15000 });

    // Verify status badge is shown (use specific locator to target status in journey list)
    await expect(page.locator('.space-y-3').getByText('Booked')).toBeVisible();
  });

  test('should display journey cost', async ({ page, request }) => {
    // Create journey with cost via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      cost: 199.99,
      carrier: 'EasyJet',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Verify cost is displayed with increased timeout
    await expect(page.getByText('$199.99')).toBeVisible({ timeout: 15000 });
  });

  test('should change journey status', async ({ page, request }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      status: 'planned',
      carrier: 'TAP',
    });
    const response = await request.post(`${API_URL}/journeys/`, { data: journeyData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Journeys/i }).click();

    // Wait for journey to load with increased timeout
    await expect(page.getByText('TAP')).toBeVisible({ timeout: 15000 });

    // Verify initially planned (use specific locator for journey list)
    await expect(page.locator('.space-y-3').getByText('Planned')).toBeVisible();

    // Edit journey using a more reliable selector
    await page.locator('.space-y-3 button').filter({ has: page.locator('svg') }).first().click();

    // Change status to booked using the status select in the form
    await page.locator('select').last().selectOption('booked');

    // Save
    await page.getByRole('button', { name: /Update Journey/i }).click();

    // Verify status changed (use specific locator for journey list)
    await expect(page.locator('.space-y-3').getByText('Booked')).toBeVisible({ timeout: 10000 });
  });
});
