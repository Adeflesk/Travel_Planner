import { test, expect, generateTripData, generateDestinationData, generateJourneyData, API_URL } from './fixtures';

test.describe('Trip Timeline', () => {
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

    // Create a trip for timeline tests
    const tripData = generateTripData({ name: 'Timeline Test Trip' });
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

  test('should display empty state when no timeline data exists', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Navigate to Timeline tab
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    await expect(authenticatedPage.getByText('No timeline data yet')).toBeVisible();
    await expect(
      authenticatedPage.getByText('Add destinations and journeys to see your trip timeline.')
    ).toBeVisible();
  });

  test('should display destinations in timeline', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations
    const now = new Date();
    const dest1Date = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dest2Date = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const dest1 = generateDestinationData(tripId, {
      name: 'Paris',
      country: 'France',
      arrival_date: dest1Date.toISOString().split('T')[0],
      departure_date: new Date(dest1Date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    const dest2 = generateDestinationData(tripId, {
      name: 'London',
      country: 'UK',
      arrival_date: dest2Date.toISOString().split('T')[0],
      departure_date: new Date(dest2Date.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    const resp1 = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const resp2 = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify destinations appear in timeline (use first() to avoid strict mode issues)
    await expect(authenticatedPage.getByText('Paris').first()).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByText('London').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display journeys in timeline', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations first
    const dest1 = generateDestinationData(tripId, {
      name: 'Rome',
      country: 'Italy',
    });
    const dest2 = generateDestinationData(tripId, {
      name: 'Venice',
      country: 'Italy',
    });

    const dest1Response = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const dest2Response = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    const origin = await dest1Response.json();
    const destination = await dest2Response.json();

    // Create journey between destinations
    const journeyData = generateJourneyData(tripId, {
      origin_id: origin.id,
      destination_id: destination.id,
      transport_mode: 'train',
      carrier: 'Trenitalia',
    });
    await authApiRequest('post', `${API_URL}/journeys/`, journeyData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify journey appears in timeline
    await expect(authenticatedPage.getByText('Trenitalia')).toBeVisible();
    // Both destinations should also be visible
    await expect(authenticatedPage.getByText('Rome').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Venice').first()).toBeVisible();
  });

  test('should display journey status badge', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Munich', country: 'Germany' });
    const dest2 = generateDestinationData(tripId, { name: 'Vienna', country: 'Austria' });

    const dest1Response = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const dest2Response = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    const origin = await dest1Response.json();
    const destination = await dest2Response.json();

    // Create journey with booked status
    const journeyData = generateJourneyData(tripId, {
      origin_id: origin.id,
      destination_id: destination.id,
      transport_mode: 'train',
      carrier: 'OBB',
      status: 'booked',
    });
    await authApiRequest('post', `${API_URL}/journeys/`, journeyData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify booked status is displayed
    await expect(authenticatedPage.getByText('Booked')).toBeVisible();
  });

  test('should display journey cost in timeline', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Barcelona', country: 'Spain' });
    const dest2 = generateDestinationData(tripId, { name: 'Madrid', country: 'Spain' });

    const dest1Response = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const dest2Response = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    const origin = await dest1Response.json();
    const destination = await dest2Response.json();

    // Create journey with cost
    const journeyData = generateJourneyData(tripId, {
      origin_id: origin.id,
      destination_id: destination.id,
      transport_mode: 'train',
      carrier: 'Renfe',
      cost: 75.50,
    });
    await authApiRequest('post', `${API_URL}/journeys/`, journeyData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify cost is displayed
    await expect(authenticatedPage.getByText('75.50 USD')).toBeVisible();
  });

  test('should show destination dates in timeline', async ({ authenticatedPage, authApiRequest }) => {
    // Create destination with dates
    const now = new Date();
    const arrivalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const departureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

    const destData = generateDestinationData(tripId, {
      name: 'Amsterdam',
      country: 'Netherlands',
      arrival_date: arrivalDate.toISOString().split('T')[0],
      departure_date: departureDate.toISOString().split('T')[0],
    });
    await authApiRequest('post', `${API_URL}/destinations/`, destData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify dates are shown
    await expect(authenticatedPage.getByText('Arrive:')).toBeVisible();
    await expect(authenticatedPage.getByText('Depart:')).toBeVisible();
  });

  test('should display multiple timeline items sorted by date', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations with dates that should sort them in order
    const now = new Date();

    const dest1 = generateDestinationData(tripId, {
      name: 'Berlin',
      country: 'Germany',
      arrival_date: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });
    const dest2 = generateDestinationData(tripId, {
      name: 'Prague',
      country: 'Czech Republic',
      arrival_date: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    await authApiRequest('post', `${API_URL}/destinations/`, dest2);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Both destinations should be visible
    await expect(authenticatedPage.getByText('Berlin').first()).toBeVisible();
    await expect(authenticatedPage.getByText('Prague').first()).toBeVisible();

    // Prague should appear before Berlin (earlier date)
    const praguePosition = await authenticatedPage.getByText('Prague').first().boundingBox();
    const berlinPosition = await authenticatedPage.getByText('Berlin').first().boundingBox();

    if (praguePosition && berlinPosition) {
      expect(praguePosition.y).toBeLessThan(berlinPosition.y);
    }
  });

  test('should display booking reference in journey', async ({ authenticatedPage, authApiRequest }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Lisbon', country: 'Portugal' });
    const dest2 = generateDestinationData(tripId, { name: 'Porto', country: 'Portugal' });

    const dest1Response = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const dest2Response = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    const origin = await dest1Response.json();
    const destination = await dest2Response.json();

    // Create journey with booking reference
    const journeyData = generateJourneyData(tripId, {
      origin_id: origin.id,
      destination_id: destination.id,
      transport_mode: 'train',
      carrier: 'CP',
      booking_reference: 'CP12345',
    });
    await authApiRequest('post', `${API_URL}/journeys/`, journeyData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Timeline/i }).click();

    // Verify booking reference is displayed
    await expect(authenticatedPage.getByText('CP12345')).toBeVisible();
  });
});
