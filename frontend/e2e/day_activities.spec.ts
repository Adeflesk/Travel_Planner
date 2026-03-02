import { test, expect, generateTripData, API_URL } from './fixtures';

test.describe('Trip Day Activities Management', () => {
    let tripId: number;
    let dayId: number;

    test.beforeEach(async ({ authenticatedPage, authApiRequest }) => {
        authenticatedPage.on('console', msg => console.log('BROWSER:', msg.text()));
        authenticatedPage.on('pageerror', error => console.error('BROWSER ERROR:', error.message));
        // Clean up trips
        const responseList = await authApiRequest('get', `${API_URL}/trips/`);
        if (responseList.ok()) {
            const trips = await responseList.json();
            for (const trip of trips) {
                await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
            }
        }

        // Create a trip
        const tripData = generateTripData({ name: 'Day Activities Test' });
        const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
        expect(tripResponse.ok()).toBeTruthy();
        const trip = await tripResponse.json();
        tripId = trip.id;

        // Create a trip day
        const dayData = {
            trip_id: tripId,
            date: '2030-05-10',
            title: 'Test Day'
        };
        const dayResponse = await authApiRequest('post', `${API_URL}/trip-days/`, dayData);
        expect(dayResponse.ok()).toBeTruthy();
        const day = await dayResponse.json();
        dayId = day.id;

        // Navigate to the day builder page
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await expect(authenticatedPage.getByText('Test Day')).toBeVisible();
    });

    test('should add a new activity to a trip day', async ({ authenticatedPage }) => {
        // Click Add Activity button
        await authenticatedPage.getByRole('button', { name: 'Activity', exact: true }).first().click();

        // Fill in activity details
        await authenticatedPage.locator('#activity-title').fill('Morning Coffee');
        await authenticatedPage.locator('#activity-location').fill('Local Cafe');
        await authenticatedPage.locator('#activity-notes').fill('Best coffee in town');
        await authenticatedPage.locator('#activity-start-time').fill('08:00');
        await authenticatedPage.locator('#activity-end-time').fill('09:00');

        // Submit form
        await authenticatedPage.getByRole('button', { name: /Save Activity/i }).click();

        // Verify activity appears in the list
        await expect(authenticatedPage.getByText('Morning Coffee')).toBeVisible();
        await expect(authenticatedPage.getByText(/08:00.*09:00/)).toBeVisible();
        await expect(authenticatedPage.getByText('Local Cafe')).toBeVisible();
    });

    test('should edit an existing activity in a trip day', async ({ authenticatedPage, authApiRequest }) => {
        // Create activity via API
        const activityData = {
            day_id: dayId,
            title: 'Original Activity',
            location: 'Original Location',
            start_time: '12:00',
            end_time: '13:00'
        };
        const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
        expect(response.ok()).toBeTruthy();

        // Refresh to see the activity
        await authenticatedPage.reload();
        await expect(authenticatedPage.getByText('Original Activity')).toBeVisible();

        // Click on the activity to edit
        await authenticatedPage.getByText('Original Activity').click();

        // Update details
        await authenticatedPage.locator('#activity-title').fill('Updated Activity Name');
        await authenticatedPage.locator('#activity-location').fill('New Location');

        // Save changes
        await authenticatedPage.getByRole('button', { name: /Save Activity/i }).click();

        // Verify updates
        await expect(authenticatedPage.getByText('Updated Activity Name')).toBeVisible();
        await expect(authenticatedPage.getByText('New Location')).toBeVisible();
        await expect(authenticatedPage.getByText('Original Activity')).not.toBeVisible();
    });

    test('should delete an activity from a trip day', async ({ authenticatedPage, authApiRequest }) => {
        // Create activity via API
        const activityData = {
            day_id: dayId,
            title: 'Activity to Delete',
            start_time: '15:00'
        };
        const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
        expect(response.ok()).toBeTruthy();

        // Refresh to see the activity
        await authenticatedPage.reload();
        await expect(authenticatedPage.getByText('Activity to Delete')).toBeVisible();

        // Click on the activity to edit
        await authenticatedPage.getByText('Activity to Delete').click();

        // Click delete button
        authenticatedPage.on('dialog', (dialog) => dialog.accept());
        await authenticatedPage.getByRole('button', { name: /^Delete$/i }).click();

        // Verify activity is gone
        await expect(authenticatedPage.getByText('Activity to Delete')).not.toBeVisible();
    });
});
