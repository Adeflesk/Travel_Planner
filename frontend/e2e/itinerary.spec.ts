import { test, expect, generateTripData, API_URL } from './fixtures';

test.describe('Itinerary / Day Management', () => {
    let tripId: number;

    test.beforeEach(async ({ authenticatedPage, authApiRequest }) => {
        console.log('--- Starting beforeEach ---');
        // Clean up trips
        const responseList = await authApiRequest('get', `${API_URL}/trips/`);
        if (responseList.ok()) {
            const trips = await responseList.json();
            for (const trip of trips) {
                await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
            }
        }

        // Create a trip for testing
        const tripData = generateTripData({ name: 'Itinerary Test Trip' });
        const response = await authApiRequest('post', `${API_URL}/trips/`, tripData);
        expect(response.ok()).toBeTruthy();
        const trip = await response.json();
        tripId = trip.id;
        console.log(`Created test trip with ID: ${tripId}`);

        // Navigate to trip detail page
        await authenticatedPage.goto(`/trips/${tripId}`);
        // Ensure we are on the Itinerary tab
        const itineraryTab = authenticatedPage.getByRole('button', { name: /Itinerary/i });
        await expect(itineraryTab).toBeVisible();
        await itineraryTab.click();

        // Wait for itinerary content to load
        await expect(authenticatedPage.getByText(/Plan your daily activities/i)).toBeVisible();
        console.log('--- Finished beforeEach ---');
    });

    test('should add a new day with custom details', async ({ authenticatedPage }) => {
        console.log('Starting: should add a new day with custom details');
        // Click Add Day button
        await authenticatedPage.getByRole('button', { name: /\+ Add Day/i }).click();

        // Verify modal is visible
        await expect(authenticatedPage.getByRole('heading', { name: 'Add Day', exact: true })).toBeVisible();

        // Fill in day details
        const testDate = '2030-05-20';
        await authenticatedPage.locator('input[type="date"]').fill(testDate);
        await authenticatedPage.getByPlaceholder(/e.g. Arrival in Tokyo/i).fill('Testing Day Title');
        await authenticatedPage.getByPlaceholder(/e.g. Tokyo, Japan/i).fill('Testing Location');
        await authenticatedPage.getByPlaceholder(/Add any general notes/i).fill('Testing Notes');

        // Submit form
        await authenticatedPage.getByRole('button', { name: 'Add Day', exact: true }).click();

        // Verify day appears in the list
        await expect(authenticatedPage.getByText('Testing Day Title')).toBeVisible({ timeout: 10000 });
        console.log('Finished: should add a new day with custom details');
    });

    test('should edit existing day details', async ({ authenticatedPage, authApiRequest }) => {
        console.log('Starting: should edit existing day details');
        // Create a day via API
        const dayPayload = {
            trip_id: tripId,
            date: '2030-06-01',
            title: 'Editable Day',
            location: 'Old City',
            notes: 'Old Notes'
        };
        console.log('Creating day via API...');
        const dayResponse = await authApiRequest('post', `${API_URL}/trip-days/`, dayPayload);
        if (!dayResponse.ok()) {
            console.error('Failed to create day via API:', await dayResponse.text());
        }
        expect(dayResponse.ok()).toBeTruthy();

        // Refresh page to see new day
        await authenticatedPage.reload();
        // Re-click itinerary tab after reload
        await authenticatedPage.getByRole('button', { name: /Itinerary/i }).click();
        await expect(authenticatedPage.getByText('Editable Day')).toBeVisible();

        // Click on the day to go to Day Builder
        await authenticatedPage.getByText('Editable Day').click();
        await expect(authenticatedPage).toHaveURL(new RegExp(`/trips/${tripId}/days/\\d+`));

        // Click on the settings icon to edit day details
        await authenticatedPage.getByTitle('Edit day details').click();

        // Verify edit modal is visible
        await expect(authenticatedPage.getByText('Edit Day Details')).toBeVisible();

        // Update details
        await authenticatedPage.locator('input[type="date"]').fill('2030-06-02');
        await authenticatedPage.getByLabel('Title').fill('Updated Day Title');
        await authenticatedPage.getByLabel('Location').fill('New City');
        await authenticatedPage.getByLabel('Notes').fill('Updated Notes');

        // Save changes
        await authenticatedPage.getByRole('button', { name: /Save Changes/i }).click();

        // Verify changes reflected in header
        await expect(authenticatedPage.getByRole('heading', { name: 'Updated Day Title' })).toBeVisible();
        console.log('Finished: should edit existing day details');
    });

    test('should delete an itinerary day', async ({ authenticatedPage, authApiRequest }) => {
        console.log('Starting: should delete an itinerary day');
        // Create a day via API
        const dayPayload = {
            trip_id: tripId,
            date: '2030-07-01',
            title: 'Day to Delete'
        };
        const dayResponse = await authApiRequest('post', `${API_URL}/trip-days/`, dayPayload);
        expect(dayResponse.ok()).toBeTruthy();

        await authenticatedPage.reload();
        await authenticatedPage.getByRole('button', { name: /Itinerary/i }).click();
        await expect(authenticatedPage.getByText('Day to Delete')).toBeVisible();
        await authenticatedPage.getByText('Day to Delete').click();

        // Open edit modal
        await authenticatedPage.getByTitle('Edit day details').click();

        // Handle the confirm dialog
        authenticatedPage.on('dialog', (dialog) => dialog.accept());

        // Click delete day button
        await authenticatedPage.getByRole('button', { name: /Delete Day/i }).click();

        // Verify navigation back to trip page and day is gone
        await expect(authenticatedPage).toHaveURL(`/trips/${tripId}`);
        await expect(authenticatedPage.getByRole('button', { name: /Itinerary/i })).toBeVisible();
        await authenticatedPage.getByRole('button', { name: /Itinerary/i }).click();
        await expect(authenticatedPage.getByText('Day to Delete')).not.toBeVisible();
        console.log('Finished: should delete an itinerary day');
    });
});
