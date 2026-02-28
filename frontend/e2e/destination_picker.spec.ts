import { test, expect, generateTripData, generateDestinationData, API_URL } from './fixtures';

test.describe('DestinationPicker — Day-Destination Linking', () => {
    let tripId: number;
    let dayId: number;

    test.beforeEach(async ({ authApiRequest }) => {
        // Clean up
        const listRes = await authApiRequest('get', `${API_URL}/trips/`);
        if (listRes.ok()) {
            const trips = await listRes.json();
            for (const trip of trips) {
                await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
            }
        }

        // Create trip
        const tripRes = await authApiRequest('post', `${API_URL}/trips/`, generateTripData({ name: 'Picker Test Trip' }));
        expect(tripRes.ok()).toBeTruthy();
        tripId = (await tripRes.json()).id;

        // Create a day (no destination yet)
        const dayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
            trip_id: tripId,
            date: '2030-06-01',
            title: 'Picker Day',
        });
        expect(dayRes.ok()).toBeTruthy();
        dayId = (await dayRes.json()).id;
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

    test('shows "No destination" badge when day has no destination linked', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await expect(authenticatedPage.getByText('No destination')).toBeVisible();
    });

    test('opens popover and lists trip destinations on click', async ({ authenticatedPage, authApiRequest }) => {
        await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Tokyo', country: 'Japan' }));
        await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Osaka', country: 'Japan' }));

        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await authenticatedPage.getByText('No destination').click();

        await expect(authenticatedPage.getByRole('button', { name: /Tokyo/ })).toBeVisible();
        await expect(authenticatedPage.getByRole('button', { name: /Osaka/ })).toBeVisible();
    });

    test('links a destination to the day on selection', async ({ authenticatedPage, authApiRequest }) => {
        await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Paris', country: 'France' }));

        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await authenticatedPage.getByText('No destination').click();
        await authenticatedPage.getByRole('button', { name: /Paris/ }).click();

        await expect(authenticatedPage.getByText('Paris, France')).toBeVisible({ timeout: 5000 });
        await expect(authenticatedPage.getByText('No destination')).not.toBeVisible();
    });

    test('unlinks a destination from the day', async ({ authenticatedPage, authApiRequest }) => {
        // Create destination, then create day with it pre-linked
        const destRes = await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Madrid', country: 'Spain' }));
        const destId = (await destRes.json()).id;

        // Create a second day with the destination already linked at creation time
        const linkedDayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
            trip_id: tripId,
            date: '2030-06-02',
            title: 'Madrid Day',
            destination_id: destId,
            location: 'Madrid',
        });
        const linkedDayId = (await linkedDayRes.json()).id;

        await authenticatedPage.goto(`/trips/${tripId}/days/${linkedDayId}`);
        await expect(authenticatedPage.getByText('Madrid, Spain')).toBeVisible();

        // Open picker and unlink
        await authenticatedPage.getByText('Madrid, Spain').click();
        await authenticatedPage.getByRole('button', { name: /Unlink destination/ }).click();

        await expect(authenticatedPage.getByText('No destination')).toBeVisible({ timeout: 5000 });
    });

    test('shows checkmark on currently linked destination', async ({ authenticatedPage, authApiRequest }) => {
        const destRes = await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Berlin', country: 'Germany' }));
        const destId = (await destRes.json()).id;

        // Create a day with destination pre-linked
        const linkedDayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
            trip_id: tripId,
            date: '2030-06-03',
            title: 'Berlin Day',
            destination_id: destId,
            location: 'Berlin',
        });
        const linkedDayId = (await linkedDayRes.json()).id;

        await authenticatedPage.goto(`/trips/${tripId}/days/${linkedDayId}`);

        // Open picker
        await authenticatedPage.getByText('Berlin, Germany').click();

        // The Berlin row's check icon should not have the 'invisible' class
        const berlinRow = authenticatedPage.getByRole('button', { name: /Berlin/ });
        await expect(berlinRow).toBeVisible();
        await expect(berlinRow.locator('svg').first()).not.toHaveClass(/invisible/);
    });

    test('creates a new destination inline and links it to the day', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);

        await authenticatedPage.getByText('No destination').click();
        await authenticatedPage.getByRole('button', { name: /New destination/ }).click();

        await authenticatedPage.getByPlaceholder('City name *').fill('Lisbon');
        await authenticatedPage.getByPlaceholder('Country (optional)').fill('Portugal');
        await authenticatedPage.getByRole('button', { name: 'Create' }).click();

        await expect(authenticatedPage.getByText('Lisbon, Portugal')).toBeVisible({ timeout: 8000 });
    });

    test('newly created destination appears in the picker list on re-open', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);

        // Create inline
        await authenticatedPage.getByText('No destination').click();
        await authenticatedPage.getByRole('button', { name: /New destination/ }).click();
        await authenticatedPage.getByPlaceholder('City name *').fill('Vienna');
        await authenticatedPage.getByRole('button', { name: 'Create' }).click();

        await expect(authenticatedPage.getByText('Vienna')).toBeVisible({ timeout: 8000 });

        // Re-open picker — Vienna should be in the list (optimistic update)
        await authenticatedPage.getByText('Vienna').click();
        await expect(authenticatedPage.getByRole('button', { name: /Vienna/ })).toBeVisible();
    });

    test('shows error banner when a save fails', async ({ authenticatedPage, authApiRequest }) => {
        // Create a destination so the popover has something to show
        await authApiRequest('post', `${API_URL}/destinations/`, generateDestinationData(tripId, { name: 'Athens', country: 'Greece' }));

        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await authenticatedPage.getByText('No destination').click();

        // Simulate failure by intercepting the PATCH and returning 500
        await authenticatedPage.route(`**/trip-days/${dayId}`, route => route.fulfill({ status: 500, body: 'error' }));

        await authenticatedPage.getByRole('button', { name: /Athens/ }).click();

        await expect(authenticatedPage.getByText(/Failed to link destination/)).toBeVisible({ timeout: 3000 });
    });
});

test.describe('TransportForm — Smart Pre-fill from Linked Destination', () => {
    let tripId: number;
    let dayId: number;

    test.beforeEach(async ({ authApiRequest }) => {
        // Clean up
        const listRes = await authApiRequest('get', `${API_URL}/trips/`);
        if (listRes.ok()) {
            const trips = await listRes.json();
            for (const trip of trips) {
                await authApiRequest('delete', `${API_URL}/trips/${trip.id}`);
            }
        }

        // Create trip
        const tripRes = await authApiRequest('post', `${API_URL}/trips/`, generateTripData({ name: 'Transport Pre-fill Test' }));
        tripId = (await tripRes.json()).id;

        // Create destination first
        const destRes = await authApiRequest('post', `${API_URL}/destinations/`, {
            trip_id: tripId,
            name: 'Sydney',
            country: 'Australia',
        });
        const destId = (await destRes.json()).id;

        // Create day with destination pre-linked at creation time
        const dayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
            trip_id: tripId,
            date: '2030-07-01',
            title: 'Sydney Day',
            destination_id: destId,
            location: 'Sydney',
        });
        dayId = (await dayRes.json()).id;
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

    test('auto-fills From field when departure day has a linked destination', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);

        // Open transport form
        await authenticatedPage.getByRole('button', { name: 'Transport' }).click();

        // Select the departure day
        await authenticatedPage.locator('select').first().selectOption(String(dayId));

        // From field should be auto-filled with "Sydney, Australia"
        await expect(authenticatedPage.locator('input[value="Sydney, Australia"]')).toBeVisible({ timeout: 3000 });

        // Hint text should appear
        await expect(authenticatedPage.getByText('Auto-filled from linked destination')).toBeVisible();
    });

    test('hint disappears when user edits the From field', async ({ authenticatedPage }) => {
        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);

        await authenticatedPage.getByRole('button', { name: 'Transport' }).click();
        await authenticatedPage.locator('select').first().selectOption(String(dayId));

        // Confirm hint appears
        await expect(authenticatedPage.getByText('Auto-filled from linked destination')).toBeVisible();

        // Edit the From field
        await authenticatedPage.locator('input[value="Sydney, Australia"]').fill('Melbourne');

        // Hint should disappear
        await expect(authenticatedPage.getByText('Auto-filled from linked destination')).not.toBeVisible();
    });

    test('no pre-fill when departure day has no linked destination', async ({ authenticatedPage, authApiRequest }) => {
        // Create an extra day with no destination
        const emptyDayRes = await authApiRequest('post', `${API_URL}/trip-days/`, {
            trip_id: tripId,
            date: '2030-07-02',
            title: 'Empty Day',
        });
        const emptyDayId = (await emptyDayRes.json()).id;

        await authenticatedPage.goto(`/trips/${tripId}/days/${dayId}`);
        await authenticatedPage.getByRole('button', { name: 'Transport' }).click();

        // Select the day with no destination using its ID
        await authenticatedPage.locator('select').first().selectOption(String(emptyDayId));

        // From field should remain empty — no hint
        await expect(authenticatedPage.getByText('Auto-filled from linked destination')).not.toBeVisible();
    });
});
