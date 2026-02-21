import { test, expect, generateTripData, generateDestinationData, API_URL } from './fixtures';

// E2E tests for journey segment builder and validation

test.describe('Journey Segment Builder', () => {
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
    // Create trip and destinations
    const tripData = generateTripData({ name: 'Segment E2E Trip' });
    const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(tripResponse.ok()).toBeTruthy();
    tripId = (await tripResponse.json()).id;
    const dest1 = generateDestinationData(tripId, { name: 'Berlin' });
    const dest2 = generateDestinationData(tripId, { name: 'Prague' });
    const d1 = await authApiRequest('post', `${API_URL}/destinations/`, dest1);
    const d2 = await authApiRequest('post', `${API_URL}/destinations/`, dest2);
    originId = (await d1.json()).id;
    destinationId = (await d2.json()).id;
  });

  test('should add a segment and validate continuity', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Journey' })).toBeVisible();

    // Add first segment (flight)
    await authenticatedPage.getByRole('button', { name: /Add Segment/i }).click();
    await authenticatedPage.getByLabel('Segment Type').selectOption('FLIGHT');
    // AirportAutocomplete: type and select for Origin
    await authenticatedPage.getByLabel('Origin').fill('Berlin');
    await authenticatedPage.waitForTimeout(500);
    const berlinOption = authenticatedPage.getByText(/Berlin.*BER/i, { exact: false });
    await expect(berlinOption).toBeVisible();
    await berlinOption.click();
    const destinationInput = authenticatedPage.getByLabel('Destination');
    await destinationInput.fill('Prague');
    await destinationInput.focus();
    await destinationInput.press('ArrowDown');
    // Retry for dropdown
    let pragueOption = authenticatedPage.locator('button', { hasText: 'Prague' });
    let found = false;
    for (let i = 0; i < 5; i++) {
      pragueOption = authenticatedPage.locator('button', { hasText: 'Prague' });
      if (await pragueOption.isVisible()) {
        found = true;
        break;
      }
      pragueOption = authenticatedPage.getByText(/Prague.*PRG/i, { exact: false });
      if (await pragueOption.isVisible()) {
        found = true;
        break;
      }
      await authenticatedPage.waitForTimeout(500);
    }
    if (!found) {
      await authenticatedPage.screenshot({ path: 'prague-dropdown-missing.png' });
      console.log('Dropdown for Prague not visible');
    }
    await expect(pragueOption).toBeVisible();
    // Retry click if needed
    for (let i = 0; i < 3; i++) {
      try {
        await pragueOption.click();
        break;
      } catch {
        await authenticatedPage.waitForTimeout(300);
      }
    }
    // Ensure segment card is expanded before accessing time inputs
    const showDetailsBtn = authenticatedPage.getByRole('button', { name: /Show details/i });
    if (await showDetailsBtn.isVisible()) {
      await showDetailsBtn.click();
    }
    // Wait for Start time input to appear (retry)
    let startTimeInput = authenticatedPage.getByLabel('Start time');
    for (let i = 0; i < 5; i++) {
      startTimeInput = authenticatedPage.getByLabel('Start time');
      if (await startTimeInput.isVisible()) break;
      await authenticatedPage.waitForTimeout(500);
    }
    if (!(await startTimeInput.isVisible())) {
      await authenticatedPage.screenshot({ path: 'start-time-missing.png' });
      console.log('Start time input not visible');
    }
    await expect(startTimeInput).toBeVisible();
    await startTimeInput.fill('2026-02-18T10:00');
    const endTimeInput = authenticatedPage.getByLabel('End time');
    await expect(endTimeInput).toBeVisible();
    await endTimeInput.fill('2026-02-18T12:00');
    await authenticatedPage.getByRole('button', { name: /Save Segment/i }).click();
    await expect(authenticatedPage.getByText('FLIGHT')).toBeVisible();

    // Add second segment with non-continuous time (should show error)
    await authenticatedPage.getByRole('button', { name: /Add Segment/i }).click();
    await authenticatedPage.getByLabel('Segment Type').selectOption('BUS');
    await authenticatedPage.getByLabel('Origin').selectOption(destinationId.toString());
    await authenticatedPage.getByLabel('Destination').selectOption(originId.toString());
    await authenticatedPage.getByLabel('Start Time').fill('2026-02-18T13:00'); // not continuous
    await authenticatedPage.getByLabel('End Time').fill('2026-02-18T15:00');
    await authenticatedPage.getByRole('button', { name: /Save Segment/i }).click();
    await expect(authenticatedPage.getByText(/must match previous segment's end/i)).toBeVisible();

    // Fix continuity
    await authenticatedPage.getByLabel('Start Time').fill('2026-02-18T12:00');
    await authenticatedPage.getByRole('button', { name: /Save Segment/i }).click();
    await expect(authenticatedPage.getByText('BUS')).toBeVisible();
  });

  test('should allow free text origin/destination', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Journeys/i }).click();
    await authenticatedPage.getByRole('button', { name: 'Add Journey' }).click();
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Journey' })).toBeVisible();

    // Add segment with free text origin/destination
    await authenticatedPage.getByRole('button', { name: /Add Segment/i }).click();
    await authenticatedPage.getByLabel('Segment Type').selectOption('STOP');
    // Wait for Origin input to be visible before filling
    const originInput = authenticatedPage.getByLabel('Origin');
    await expect(originInput).toBeVisible();
    await originInput.fill('My House');
    const destinationInput = authenticatedPage.getByLabel('Destination');
    await expect(destinationInput).toBeVisible();
    await destinationInput.fill('Bus Station');
    // Ensure segment card is expanded before accessing time inputs
    const showDetailsBtn = authenticatedPage.getByRole('button', { name: /Show details/i });
    if (await showDetailsBtn.isVisible()) {
      await showDetailsBtn.click();
    }
    // Wait for Start time input to appear (retry)
    let startTimeInput = authenticatedPage.getByLabel('Start time');
    for (let i = 0; i < 5; i++) {
      startTimeInput = authenticatedPage.getByLabel('Start time');
      if (await startTimeInput.isVisible()) break;
      await authenticatedPage.waitForTimeout(500);
    }
    if (!(await startTimeInput.isVisible())) {
      await authenticatedPage.screenshot({ path: 'start-time-missing-freetext.png' });
      console.log('Start time input not visible (free text test)');
    }
    await expect(startTimeInput).toBeVisible();
    await startTimeInput.fill('2026-02-18T08:00');
    const endTimeInput = authenticatedPage.getByLabel('End time');
    await expect(endTimeInput).toBeVisible();
    await endTimeInput.fill('2026-02-18T09:00');
    await authenticatedPage.getByRole('button', { name: /Save Segment/i }).click();
    await expect(authenticatedPage.getByText('STOP')).toBeVisible();
  });
});
