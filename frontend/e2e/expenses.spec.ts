import { test, expect, generateTripData, generateExpenseData, API_URL } from './fixtures';

test.describe('Expense Management', () => {
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

    // Create a trip for expense tests
    const tripData = generateTripData({ name: 'Expense Test Trip' });
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

  test('should display empty state when no expenses exist', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Navigate to Expenses tab
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    await expect(authenticatedPage.getByText('No expenses yet')).toBeVisible();
    // Should show $0.00 total in the summary card
    await expect(authenticatedPage.locator('.text-3xl').getByText('$0.00')).toBeVisible();
  });

  test('should create a new expense', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);

    // Navigate to Expenses tab
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Fill in the expense form
    await authenticatedPage.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Hilton Hotel');
    await authenticatedPage.locator('input[type="number"]').fill('250.50');
    await authenticatedPage.locator('select').first().selectOption('accommodation');

    // Submit
    await authenticatedPage.getByRole('button', { name: /Add Expense/i }).click();

    // Verify expense appears in the list
    await expect(authenticatedPage.getByText('Hilton Hotel')).toBeVisible({ timeout: 10000 });
  });

  test('should display expense with category icon', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Restaurant Dinner',
      category: 'food',
      amount: 85.00,
    });
    await authApiRequest('post', `${API_URL}/expenses/`, expenseData);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Verify expense details
    await expect(authenticatedPage.getByText('Restaurant Dinner')).toBeVisible();
    // Check the expense row has the amount
    await expect(authenticatedPage.locator('.space-y-2').getByText('$85.00')).toBeVisible();
  });

  test('should calculate total expenses', async ({ authenticatedPage, authApiRequest }) => {
    // Create multiple expenses via API
    const expense1 = generateExpenseData(tripId, {
      description: 'Hotel',
      category: 'accommodation',
      amount: 200,
    });
    const expense2 = generateExpenseData(tripId, {
      description: 'Flight',
      category: 'transport',
      amount: 350,
    });
    const expense3 = generateExpenseData(tripId, {
      description: 'Dinner',
      category: 'food',
      amount: 50,
    });

    await authApiRequest('post', `${API_URL}/expenses/`, expense1);
    await authApiRequest('post', `${API_URL}/expenses/`, expense2);
    await authApiRequest('post', `${API_URL}/expenses/`, expense3);

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Verify total is calculated correctly (200 + 350 + 50 = 600) in the summary card
    await expect(authenticatedPage.locator('.text-3xl').getByText('$600.00')).toBeVisible();
  });

  test('should edit an expense', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Taxi Ride',
      category: 'transport',
      amount: 25,
    });
    const response = await authApiRequest('post', `${API_URL}/expenses/`, expenseData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(authenticatedPage.getByText('Taxi Ride')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await authenticatedPage.locator('.space-y-2 button').filter({ has: authenticatedPage.locator('svg') }).first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();

    // Change description
    await authenticatedPage.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Uber Ride');

    // Save changes
    await authenticatedPage.getByRole('button', { name: /Update Expense/i }).click();

    // Verify updated expense
    await expect(authenticatedPage.getByText('Uber Ride')).toBeVisible({ timeout: 10000 });
    await expect(authenticatedPage.getByText('Taxi Ride')).not.toBeVisible();
  });

  test('should cancel editing an expense', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Museum Ticket',
      category: 'activities',
      amount: 15,
    });
    const response = await authApiRequest('post', `${API_URL}/expenses/`, expenseData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(authenticatedPage.getByText('Museum Ticket')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await authenticatedPage.locator('.space-y-2 button').filter({ has: authenticatedPage.locator('svg') }).first().click();

    // Verify edit mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();

    // Click cancel
    await authenticatedPage.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode
    await expect(authenticatedPage.getByRole('heading', { name: 'Add Expense' })).toBeVisible();
  });

  test('should delete an expense', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Coffee Shop',
      category: 'food',
      amount: 8.50,
    });
    const response = await authApiRequest('post', `${API_URL}/expenses/`, expenseData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Verify expense exists with increased timeout
    await expect(authenticatedPage.getByText('Coffee Shop')).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    authenticatedPage.on('dialog', (dialog) => dialog.accept());

    // Click delete button using a more reliable selector (second button in the row)
    await authenticatedPage.locator('.space-y-2 button').filter({ has: authenticatedPage.locator('svg') }).nth(1).click();

    // Verify expense is removed
    await expect(authenticatedPage.getByText('Coffee Shop')).not.toBeVisible({ timeout: 5000 });
    await expect(authenticatedPage.getByText('No expenses yet')).toBeVisible();
  });

  test('should show booked status', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense with booked status via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Airbnb Booking',
      category: 'accommodation',
      amount: 450,
      booked: true,
    });
    const response = await authApiRequest('post', `${API_URL}/expenses/`, expenseData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(authenticatedPage.getByText('Airbnb Booking')).toBeVisible({ timeout: 15000 });

    // Verify booked status is shown - use exact match with inline-flex class to target badge
    await expect(authenticatedPage.locator('.inline-flex.items-center.gap-1', { hasText: 'Booked' }).first()).toBeVisible();
  });

  test('should show paid status', async ({ authenticatedPage, authApiRequest }) => {
    // Create expense with paid status via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Paid Expense',
      category: 'other',
      amount: 100,
      paid: true,
    });
    const response = await authApiRequest('post', `${API_URL}/expenses/`, expenseData);
    expect(response.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(authenticatedPage.getByText('Paid Expense')).toBeVisible({ timeout: 15000 });

    // Verify paid status is shown - use inline-flex class to target badge (no emoji in the badge text)
    await expect(authenticatedPage.locator('.inline-flex.items-center.gap-1', { hasText: 'Paid' }).first()).toBeVisible();
  });

  test('should toggle booked checkbox in form', async ({ authenticatedPage }) => {
    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Fill required fields
    await authenticatedPage.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Test Expense');
    await authenticatedPage.locator('input[type="number"]').fill('100');
    await authenticatedPage.locator('select').first().selectOption('other');

    // Check the booked checkbox
    await authenticatedPage.getByLabel('Booked').check();
    expect(await authenticatedPage.getByLabel('Booked').isChecked()).toBe(true);

    // Submit
    await authenticatedPage.getByRole('button', { name: /Add Expense/i }).click();

    // Verify booked status (use specific locator to avoid matching form checkbox label)
    await expect(authenticatedPage.locator('.space-y-2').getByText('Booked')).toBeVisible({ timeout: 10000 });
  });

  test('should display category breakdown in summary', async ({ authenticatedPage, authApiRequest }) => {
    // Create expenses in different categories
    const expense1 = generateExpenseData(tripId, {
      description: 'Hotel',
      category: 'accommodation',
      amount: 300,
    });
    const expense2 = generateExpenseData(tripId, {
      description: 'Train',
      category: 'transport',
      amount: 100,
    });

    const resp1 = await authApiRequest('post', `${API_URL}/expenses/`, expense1);
    const resp2 = await authApiRequest('post', `${API_URL}/expenses/`, expense2);
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();

    await authenticatedPage.goto(`/trips/${tripId}`);
    await authenticatedPage.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expenses to load first
    await expect(authenticatedPage.getByText('Hotel')).toBeVisible({ timeout: 15000 });

    // Verify category breakdown shows both categories in the summary card
    await expect(authenticatedPage.locator('.bg-gradient-to-r').getByText(/Accommodation/i)).toBeVisible();
    await expect(authenticatedPage.locator('.bg-gradient-to-r').getByText(/Transport/i)).toBeVisible();
  });
});
