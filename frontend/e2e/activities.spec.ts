import { test, expect, generateTripData, generateDestinationData, API_URL } from './fixtures';

function generateActivityData(destinationId: number, overrides = {}) {
  const now = new Date();
  const scheduledDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  return {
    destination_id: destinationId,
    name: `Test Activity ${Date.now()}`,
    description: 'E2E test activity',
    activity_type: 'sightseeing',
    scheduled_date: scheduledDate.toISOString().split('T')[0],
    is_todo: false,
    is_completed: false,
    ...overrides,
  };
}

test.describe('Activity Management', () => {
  let tripId: number;
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

    // Create a trip for activity tests
    const tripData = generateTripData({ name: 'Activity Test Trip' });
    const tripResponse = await authApiRequest('post', `${API_URL}/trips/`, tripData);
    expect(tripResponse.ok()).toBeTruthy();
    const trip = await tripResponse.json();
    tripId = trip.id;
    expect(tripId).toBeDefined();

    // Create a destination for activities
    const destData = generateDestinationData(tripId, { name: 'Paris', country: 'France' });
    const destResponse = await authApiRequest('post', `${API_URL}/destinations/`, destData);
    expect(destResponse.ok()).toBeTruthy();
    const dest = await destResponse.json();
    destinationId = dest.id;
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

  test('should display empty state when no activities exist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    await expect(authenticatedPage.getByText('No activities yet')).toBeVisible();
  });

  test('should create a scheduled activity', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for the activity form to be visible
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Activity' })).toBeVisible();

    // Get the activity form specifically (inside the border-t section)
    const activitySection = authenticatedPage.locator('.border-t').filter({ hasText: 'Add Activity' });

    // Fill in the activity form
    await activitySection.getByPlaceholder('Activity name').fill('Visit Eiffel Tower');
    await activitySection.locator('textarea').fill('Must-see landmark');

    // Set scheduled date - target the date input in the activity form
    const scheduledDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
    await activitySection.locator('input[type="date"]').fill(scheduledDate.toISOString().split('T')[0]);

    // Submit
    await activitySection.getByRole('button', { name: /Add Activity/i }).click();

    // Verify activity appears in scheduled activities
    await expect(authenticatedPage.getByText('Visit Eiffel Tower')).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText('Must-see landmark')).toBeVisible();
  });

  test('should create a todo item', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for the activity form to be visible
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Activity' })).toBeVisible();

    // Get the activity form specifically
    const activityForm = authenticatedPage.locator('form').filter({ hasText: 'Add Activity' });

    // Fill in the activity form
    await activityForm.getByPlaceholder('Activity name').fill('Book museum tickets');

    // Check the todo checkbox
    await activityForm.getByLabel('Mark as todo item').check();

    // Wait for API response when submitting
    const responsePromise = authenticatedPage.waitForResponse(
      (response) => response.url().includes('/activities/') && response.request().method() === 'POST'
    );

    // Submit
    await activityForm.getByRole('button', { name: /Add Activity/i }).click();

    // Wait for API response
    const response = await responsePromise;
    expect(response.status()).toBe(201);

    // Verify todo appears in the checklist
    await expect(authenticatedPage.getByText('Todo Checklist')).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.locator('.space-y-2').getByText('Book museum tickets')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle todo completion', async ({ authenticatedPage, authApiRequest }) => {
    // Create todo via API
    const activityData = generateActivityData(destinationId, {
      name: 'Pack bags',
      is_todo: true,
      is_completed: false,
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for todo to load
    await expect(authenticatedPage.getByText('Pack bags')).toBeVisible({ timeout: 15000 });

    // Verify initial state shows 0 completed
    await expect(authenticatedPage.getByText('(0/1 completed)')).toBeVisible();

    // Click the toggle button (circle icon)
    await authenticatedPage.locator('button').filter({ has: authenticatedPage.locator('svg.lucide-circle') }).click();

    // Verify completion state changes
    await expect(authenticatedPage.getByText('(1/1 completed)')).toBeVisible({ timeout: 10000 });
  });

  test('should edit a scheduled activity', async ({ authenticatedPage, authApiRequest }) => {
    // Create activity via API
    const activityData = generateActivityData(destinationId, {
      name: 'Louvre Museum',
      description: 'Visit the art museum',
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for activity to load
    await expect(authenticatedPage.getByText('Louvre Museum')).toBeVisible({ timeout: 15000 });

    // Get the activity section
    const activitySection = authenticatedPage.locator('.border-t').filter({ hasText: 'Louvre Museum' });

    // Click edit button within the activity section
    await activitySection.locator('.space-y-2 button').first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Activity' })).toBeVisible();

    // Change the name
    await authenticatedPage.getByPlaceholder('Activity name').fill('Musee d\'Orsay');

    // Save changes
    await authenticatedPage.getByRole('button', { name: /Update Activity/i }).click();

    // Verify updated activity
    await expect(authenticatedPage.getByText('Musee d\'Orsay')).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText('Louvre Museum')).not.toBeVisible();
  });

  test('should cancel editing an activity', async ({ authenticatedPage, authApiRequest }) => {
    // Create activity via API
    const activityData = generateActivityData(destinationId, {
      name: 'Seine River Cruise',
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for activity to load
    await expect(authenticatedPage.getByText('Seine River Cruise')).toBeVisible({ timeout: 15000 });

    // Get the activity section
    const activitySection = authenticatedPage.locator('.border-t').filter({ hasText: 'Seine River Cruise' });

    // Click edit button within the activity section
    await activitySection.locator('.space-y-2 button').first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Activity' })).toBeVisible();

    // Click cancel
    await authenticatedPage.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Activity' })).toBeVisible();
  });

  test('should delete a scheduled activity', async ({ authenticatedPage, authApiRequest }) => {
    // Create activity via API
    const activityData = generateActivityData(destinationId, {
      name: 'Notre Dame Visit',
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Verify activity exists
    await expect(authenticatedPage.getByText('Notre Dame Visit')).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Get the activity section and click delete button
    const activitySection = authenticatedPage.locator('.border-t').filter({ hasText: 'Notre Dame Visit' });
    await activitySection.locator('.space-y-2 button').nth(1).click();

    // Verify activity is removed
    await expect(authenticatedPage.getByText('Notre Dame Visit')).not.toBeVisible({ timeout: 5000 });
  });

  test('should delete a todo item', async ({ authenticatedPage, authApiRequest }) => {
    // Create todo via API
    const activityData = generateActivityData(destinationId, {
      name: 'Buy metro pass',
      is_todo: true,
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Verify todo exists
    await expect(authenticatedPage.getByText('Buy metro pass')).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Find the todo item row and click the delete button (red trash icon)
    // For todos: toggle button, then flex with edit/delete
    const todoItem = authenticatedPage.locator('.border-t .space-y-2 > div').filter({ hasText: 'Buy metro pass' });
    await todoItem.locator('button.text-red-600').click();

    // Verify todo is removed
    await expect(authenticatedPage.getByText('Buy metro pass')).not.toBeVisible({ timeout: 5000 });
  });

  test('should display both scheduled activities and todos', async ({ authenticatedPage, authApiRequest }) => {
    // Create a scheduled activity via API
    const scheduledActivity = generateActivityData(destinationId, {
      name: 'Arc de Triomphe',
      is_todo: false,
    });
    const resp1 = await authApiRequest('post', `${API_URL}/activities/`, scheduledActivity);
    expect(resp1.ok()).toBeTruthy();

    // Create a todo via API
    const todoActivity = generateActivityData(destinationId, {
      name: 'Get travel insurance',
      is_todo: true,
    });
    const resp2 = await authApiRequest('post', `${API_URL}/activities/`, todoActivity);
    expect(resp2.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Verify both sections are visible
    await expect(authenticatedPage.getByText('Scheduled Activities')).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByText('Todo Checklist')).toBeVisible();

    // Verify both items are visible
    await expect(authenticatedPage.getByText('Arc de Triomphe')).toBeVisible();
    await expect(authenticatedPage.getByText('Get travel insurance')).toBeVisible();
  });

  test('should show activity description', async ({ authenticatedPage, authApiRequest }) => {
    // Create activity with description via API
    const activityData = generateActivityData(destinationId, {
      name: 'Montmartre Walk',
      description: 'Explore the artistic neighborhood',
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Verify activity and description are visible
    await expect(authenticatedPage.getByText('Montmartre Walk')).toBeVisible({ timeout: 15000 });
    await expect(authenticatedPage.getByText('Explore the artistic neighborhood')).toBeVisible();
  });

  test('should display scheduled date for activities', async ({ authenticatedPage, authApiRequest }) => {
    const scheduledDate = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);

    // Create activity with scheduled date via API
    const activityData = generateActivityData(destinationId, {
      name: 'Palace of Versailles',
      scheduled_date: scheduledDate.toISOString().split('T')[0],
    });
    const response = await authApiRequest('post', `${API_URL}/activities/`, activityData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Verify activity is visible with date
    await expect(authenticatedPage.getByText('Palace of Versailles')).toBeVisible({ timeout: 15000 });
  });

  test('should disable date field when todo is checked', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Expand activities section
    await authenticatedPage.getByText('Show Activities').click();

    // Wait for the activity form to be visible
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Activity' })).toBeVisible();

    // Get the activity form specifically
    const activitySection = authenticatedPage.locator('.border-t').filter({ hasText: 'Add Activity' });

    // Verify date field is enabled initially
    const dateInput = activitySection.locator('input[type="date"]');
    await expect(dateInput).not.toBeDisabled();

    // Check the todo checkbox
    await activitySection.getByLabel('Mark as todo item').check();

    // Verify date field is disabled
    await expect(dateInput).toBeDisabled();
  });
});
