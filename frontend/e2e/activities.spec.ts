import { test, expect, generateTripData, generateDestinationData, API_URL } from './fixtures';
import type { Page } from '@playwright/test';

test.describe('Activities Tab', () => {
  let tripId: number;
  let destinationId: number;

  test.beforeEach(async ({ authApiRequest }) => {
    const listRes = await authApiRequest('get', `${API_URL}/trips/`);
    if (listRes.ok()) {
      const trips = await listRes.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }

    const tripRes = await authApiRequest('post', `${API_URL}/trips/`, generateTripData({ name: 'Activity Test Trip' }));
    expect(tripRes.ok()).toBeTruthy();
    tripId = (await tripRes.json()).id;

    const destRes = await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Paris', country: 'France' }));
    expect(destRes.ok()).toBeTruthy();
    destinationId = (await destRes.json()).id;
  });

  test.afterEach(async ({ authApiRequest }) => {
    const listRes = await authApiRequest('get', `${API_URL}/trips/`);
    if (listRes.ok()) {
      const trips = await listRes.json();
      for (const trip of trips) {
        await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
      }
    }
  });

  async function openActivitiesTab(page: Page) {
    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: 'Activities' }).click();
  }

  test('should show empty state when destination has no activities', async ({ authenticatedPage }) => {
    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByText('No activities for this destination')).toBeVisible({ timeout: 10000 });
  });

  test('should display activity created via API', async ({ authenticatedPage, authApiRequest }) => {
    await authApiRequest('post', `${API_URL}/activities/`, {
      title: 'Eiffel Tower',
      destination_id: destinationId,
    });

    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByText('Eiffel Tower')).toBeVisible({ timeout: 10000 });
  });

  test('should group activities under destination name', async ({ authenticatedPage, authApiRequest }) => {
    await authApiRequest('post', `${API_URL}/activities/`, { title: 'Louvre', destination_id: destinationId });
    await authApiRequest('post', `${API_URL}/activities/`, { title: 'Montmartre', destination_id: destinationId });

    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByRole('heading', { name: 'Paris' })).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText('Louvre')).toBeVisible();
    await expect(authenticatedPage.getByText('Montmartre')).toBeVisible();
    await expect(authenticatedPage.getByText('2 activities')).toBeVisible();
  });

  test('should toggle activity completion', async ({ authenticatedPage, authApiRequest }) => {
    await authApiRequest('post', `${API_URL}/activities/`, {
      title: 'Arc de Triomphe',
      destination_id: destinationId,
    });

    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByText('Arc de Triomphe')).toBeVisible({ timeout: 10000 });

    // Mark complete
    await authenticatedPage.getByRole('button', { name: 'Mark complete' }).click();
    await expect(authenticatedPage.getByRole('button', { name: 'Mark incomplete' })).toBeVisible({ timeout: 5000 });

    // Mark incomplete again
    await authenticatedPage.getByRole('button', { name: 'Mark incomplete' }).click();
    await expect(authenticatedPage.getByRole('button', { name: 'Mark complete' })).toBeVisible({ timeout: 5000 });
  });

  test('should delete an activity', async ({ authenticatedPage, authApiRequest }) => {
    await authApiRequest('post', `${API_URL}/activities/`, {
      title: 'Notre Dame',
      destination_id: destinationId,
    });

    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByText('Notre Dame')).toBeVisible({ timeout: 10000 });

    authenticatedPage.on('dialog', (dialog) => dialog.accept());
    await authenticatedPage.getByRole('button', { name: 'Delete activity' }).click();

    await expect(authenticatedPage.getByText('Notre Dame')).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText('No activities for this destination')).toBeVisible();
  });

  test('should show progress bar when activities exist', async ({ authenticatedPage, authApiRequest }) => {
    await authApiRequest('post', `${API_URL}/activities/`, { title: 'Activity A', destination_id: destinationId });
    await authApiRequest('post', `${API_URL}/activities/`, {
      title: 'Activity B',
      destination_id: destinationId,
      is_completed: true,
    });

    await openActivitiesTab(authenticatedPage);
    // Progress component is shown when there are activities
    await expect(authenticatedPage.getByText('Activity A')).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText('Activity B')).toBeVisible();
  });

  test('day builder activity appears in Activities tab', async ({ authenticatedPage, authApiRequest }) => {
    // Create a trip day linked to the destination
    const dayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
      trip_id: tripId,
      date: '2030-06-01',
    });
    expect(dayRes.ok()).toBeTruthy();
    const dayId = (await dayRes.json()).id;

    // Create activity via day builder API (both day_id and destination_id set)
    const actRes = await authApiRequest('post', `${API_URL}/activities/`, {
      title: 'Day Builder Activity',
      day_id: dayId,
      destination_id: destinationId,
    });
    expect(actRes.ok()).toBeTruthy();

    await openActivitiesTab(authenticatedPage);
    await expect(authenticatedPage.getByText('Day Builder Activity')).toBeVisible({ timeout: 10000 });
  });
});
