import { test, expect, generateTripData, generateDestinationData, generateJourneyData } from './fixtures';

const API_URL = 'http://localhost:8000';

test.describe('Trip Timeline', () => {
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

    // Create a trip for timeline tests
    const tripData = generateTripData({ name: 'Timeline Test Trip' });
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

  test('should display empty state when no timeline data exists', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Navigate to Timeline tab
    await page.getByRole('button', { name: /Timeline/i }).click();

    await expect(page.getByText('No timeline data yet')).toBeVisible();
    await expect(
      page.getByText('Add destinations and journeys to see your trip timeline.')
    ).toBeVisible();
  });

  test('should display destinations in timeline', async ({ page, request }) => {
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

    const resp1 = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const resp2 = await request.post(`${API_URL}/destinations/`, { data: dest2 });
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify destinations appear in timeline (use first() to avoid strict mode issues)
    await expect(page.getByText('Paris').first()).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('London').first()).toBeVisible({ timeout: 15000 });
  });

  test('should display journeys in timeline', async ({ page, request }) => {
    // Create destinations first
    const dest1 = generateDestinationData(tripId, {
      name: 'Rome',
      country: 'Italy',
    });
    const dest2 = generateDestinationData(tripId, {
      name: 'Venice',
      country: 'Italy',
    });

    const dest1Response = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const dest2Response = await request.post(`${API_URL}/destinations/`, { data: dest2 });
    const origin = await dest1Response.json();
    const destination = await dest2Response.json();

    // Create journey between destinations
    const journeyData = generateJourneyData(tripId, {
      origin_id: origin.id,
      destination_id: destination.id,
      transport_mode: 'train',
      carrier: 'Trenitalia',
    });
    await request.post(`${API_URL}/journeys/`, { data: journeyData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify journey appears in timeline
    await expect(page.getByText('Trenitalia')).toBeVisible();
    // Both destinations should also be visible
    await expect(page.getByText('Rome').first()).toBeVisible();
    await expect(page.getByText('Venice').first()).toBeVisible();
  });

  test('should display journey status badge', async ({ page, request }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Munich', country: 'Germany' });
    const dest2 = generateDestinationData(tripId, { name: 'Vienna', country: 'Austria' });

    const dest1Response = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const dest2Response = await request.post(`${API_URL}/destinations/`, { data: dest2 });
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
    await request.post(`${API_URL}/journeys/`, { data: journeyData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify booked status is displayed
    await expect(page.getByText('Booked')).toBeVisible();
  });

  test('should display journey cost in timeline', async ({ page, request }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Barcelona', country: 'Spain' });
    const dest2 = generateDestinationData(tripId, { name: 'Madrid', country: 'Spain' });

    const dest1Response = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const dest2Response = await request.post(`${API_URL}/destinations/`, { data: dest2 });
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
    await request.post(`${API_URL}/journeys/`, { data: journeyData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify cost is displayed
    await expect(page.getByText('$75.50')).toBeVisible();
  });

  test('should show destination dates in timeline', async ({ page, request }) => {
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
    await request.post(`${API_URL}/destinations/`, { data: destData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify dates are shown
    await expect(page.getByText('Arrive:')).toBeVisible();
    await expect(page.getByText('Depart:')).toBeVisible();
  });

  test('should display multiple timeline items sorted by date', async ({ page, request }) => {
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

    await request.post(`${API_URL}/destinations/`, { data: dest1 });
    await request.post(`${API_URL}/destinations/`, { data: dest2 });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Both destinations should be visible
    await expect(page.getByText('Berlin').first()).toBeVisible();
    await expect(page.getByText('Prague').first()).toBeVisible();

    // Prague should appear before Berlin (earlier date)
    const praguePosition = await page.getByText('Prague').first().boundingBox();
    const berlinPosition = await page.getByText('Berlin').first().boundingBox();

    if (praguePosition && berlinPosition) {
      expect(praguePosition.y).toBeLessThan(berlinPosition.y);
    }
  });

  test('should display booking reference in journey', async ({ page, request }) => {
    // Create destinations
    const dest1 = generateDestinationData(tripId, { name: 'Lisbon', country: 'Portugal' });
    const dest2 = generateDestinationData(tripId, { name: 'Porto', country: 'Portugal' });

    const dest1Response = await request.post(`${API_URL}/destinations/`, { data: dest1 });
    const dest2Response = await request.post(`${API_URL}/destinations/`, { data: dest2 });
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
    await request.post(`${API_URL}/journeys/`, { data: journeyData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Timeline/i }).click();

    // Verify booking reference is displayed
    await expect(page.getByText('CP12345')).toBeVisible();
  });
});
