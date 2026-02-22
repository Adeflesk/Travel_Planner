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

    // Step 1: select template and advance to segment editor
    await authenticatedPage.getByRole('button', { name: /Simple/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Use template →' }).click();

    // Step 2: fill origin and destination
    await expect(authenticatedPage.getByText('Segment 1 of 1')).toBeVisible();
    await authenticatedPage.getByPlaceholder('Enter origin').fill('Paris');
    await authenticatedPage.getByPlaceholder('Enter destination').fill('London');

    // Advance to review step
    await authenticatedPage.getByRole('button', { name: 'Review →' }).click();
    await expect(authenticatedPage.getByText(/Review your journey/i)).toBeVisible();

    // Submit
    await authenticatedPage.getByRole('button', { name: 'Save Journey' }).click();

    // Verify journey appears
    await expect(authenticatedPage.locator('text=Paris').first()).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.locator('text=London').first()).toBeVisible({ timeout: 10000 });
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
    await authenticatedPage.setViewportSize({ width: 1280, height: 1600 });
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Verify journey details with increased timeout
    await expect(authenticatedPage.getByText('Eurostar')).toBeVisible({ timeout: 15000 });
  });

  test('should edit a journey segment', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      transport_mode: 'train',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();
    const journey = await response.json();

    // Create a segment via API
    const segmentResponse = await authApiRequest('post', `${API_URL}/journeys/${journey.id}/segments`, {
      journey_id: journey.id,
      segment_type: 'TRANSFER',
      origin_id: originId,
      origin_name: 'Paris',
      destination_id: destinationId,
      destination_name: 'London',
      order: 0,
    });
    expect(segmentResponse.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.setViewportSize({ width: 1280, height: 1600 });
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Open segments manager
    await authenticatedPage.getByTitle('Manage segments').click();
    await expect(authenticatedPage.getByText('Journey segments')).toBeVisible({ timeout: 10000 });

    // Open edit modal
    await authenticatedPage.getByRole('button', { name: 'Edit' }).first().click();
    await expect(authenticatedPage.getByText('Edit segment')).toBeVisible();

    // Update destination
    await authenticatedPage.getByPlaceholder('Enter destination').fill('Berlin');

    // Save
    await authenticatedPage.getByRole('button', { name: 'Save changes' }).click({ force: true });

    // Verify updated segment in list
    await expect(authenticatedPage.getByText('Paris -> Berlin')).toBeVisible({ timeout: 10000 });
  });

  test('should cancel editing a journey segment', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      transport_mode: 'train',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();
    const journey = await response.json();

    // Create a segment via API
    const segmentResponse = await authApiRequest('post', `${API_URL}/journeys/${journey.id}/segments`, {
      journey_id: journey.id,
      segment_type: 'TRANSFER',
      origin_id: originId,
      origin_name: 'Paris',
      destination_id: destinationId,
      destination_name: 'London',
      order: 0,
    });
    expect(segmentResponse.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    // Open segments manager
    await authenticatedPage.getByTitle('Manage segments').click();
    await expect(authenticatedPage.getByText('Journey segments')).toBeVisible({ timeout: 10000 });

    // Open edit modal
    await authenticatedPage.getByRole('button', { name: 'Edit' }).first().click();
    await expect(authenticatedPage.getByText('Edit segment')).toBeVisible();

    // Cancel via programmatic click to avoid viewport issues
    await authenticatedPage
      .getByRole('button', { name: 'Close' })
      .evaluate((el) => (el as HTMLElement).click());

    // Modal should close
    await expect(authenticatedPage.getByText('Edit segment')).not.toBeVisible();
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

  test('should open journey segments manager from list', async ({ authenticatedPage, authApiRequest }) => {
    // Create journey via API
    const journeyData = generateJourneyData(tripId, {
      origin_id: originId,
      destination_id: destinationId,
      transport_mode: 'bus',
    });
    const response = await authApiRequest('post', `${API_URL}/journeys/`, journeyData);
    expect(response.ok()).toBeTruthy();
    const journey = await response.json();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();

    await authenticatedPage.getByTitle('Manage segments').click();
    await expect(authenticatedPage).toHaveURL(`/trips/${tripId}/journeys/${journey.id}`);
    await expect(authenticatedPage.getByText('Journey segments')).toBeVisible();
  });
});
