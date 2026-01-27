import { test, expect, generateTripData, generateExpenseData } from './fixtures';

const API_URL = 'http://localhost:8000';

test.describe('Expense Management', () => {
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

    // Create a trip for expense tests
    const tripData = generateTripData({ name: 'Expense Test Trip' });
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

  test('should display empty state when no expenses exist', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Navigate to Expenses tab
    await page.getByRole('button', { name: /Expenses/i }).click();

    await expect(page.getByText('No expenses yet')).toBeVisible();
    // Should show $0.00 total in the summary card
    await expect(page.locator('.text-3xl').getByText('$0.00')).toBeVisible();
  });

  test('should create a new expense', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);

    // Navigate to Expenses tab
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Fill in the expense form
    await page.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Hilton Hotel');
    await page.locator('input[type="number"]').fill('250.50');
    await page.locator('select').first().selectOption('accommodation');

    // Submit
    await page.getByRole('button', { name: /Add Expense/i }).click();

    // Verify expense appears in the list
    await expect(page.getByText('Hilton Hotel')).toBeVisible({ timeout: 10000 });
  });

  test('should display expense with category icon', async ({ page, request }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Restaurant Dinner',
      category: 'food',
      amount: 85.00,
    });
    await request.post(`${API_URL}/expenses/`, { data: expenseData });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Verify expense details
    await expect(page.getByText('Restaurant Dinner')).toBeVisible();
    // Check the expense row has the amount
    await expect(page.locator('.space-y-2').getByText('$85.00')).toBeVisible();
  });

  test('should calculate total expenses', async ({ page, request }) => {
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

    await request.post(`${API_URL}/expenses/`, { data: expense1 });
    await request.post(`${API_URL}/expenses/`, { data: expense2 });
    await request.post(`${API_URL}/expenses/`, { data: expense3 });

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Verify total is calculated correctly (200 + 350 + 50 = 600) in the summary card
    await expect(page.locator('.text-3xl').getByText('$600.00')).toBeVisible();
  });

  test('should edit an expense', async ({ page, request }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Taxi Ride',
      category: 'transport',
      amount: 25,
    });
    const response = await request.post(`${API_URL}/expenses/`, { data: expenseData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(page.getByText('Taxi Ride')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-2 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();

    // Change description
    await page.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Uber Ride');

    // Save changes
    await page.getByRole('button', { name: /Update Expense/i }).click();

    // Verify updated expense
    await expect(page.getByText('Uber Ride')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Taxi Ride')).not.toBeVisible();
  });

  test('should cancel editing an expense', async ({ page, request }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Museum Ticket',
      category: 'activities',
      amount: 15,
    });
    const response = await request.post(`${API_URL}/expenses/`, { data: expenseData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(page.getByText('Museum Ticket')).toBeVisible({ timeout: 15000 });

    // Click edit button using a more reliable selector
    await page.locator('.space-y-2 button').filter({ has: page.locator('svg') }).first().click();

    // Verify edit mode
    await expect(page.getByRole('heading', { name: 'Edit Expense' })).toBeVisible();

    // Click cancel
    await page.getByRole('button', { name: /Cancel/i }).click();

    // Verify back to add mode
    await expect(page.getByRole('heading', { name: 'Add Expense' })).toBeVisible();
  });

  test('should delete an expense', async ({ page, request }) => {
    // Create expense via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Coffee Shop',
      category: 'food',
      amount: 8.50,
    });
    const response = await request.post(`${API_URL}/expenses/`, { data: expenseData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Verify expense exists with increased timeout
    await expect(page.getByText('Coffee Shop')).toBeVisible({ timeout: 15000 });

    // Handle the confirm dialog
    page.on('dialog', (dialog) => dialog.accept());

    // Click delete button using a more reliable selector (second button in the row)
    await page.locator('.space-y-2 button').filter({ has: page.locator('svg') }).nth(1).click();

    // Verify expense is removed
    await expect(page.getByText('Coffee Shop')).not.toBeVisible({ timeout: 5000 });
    await expect(page.getByText('No expenses yet')).toBeVisible();
  });

  test('should show booked status', async ({ page, request }) => {
    // Create expense with booked status via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Airbnb Booking',
      category: 'accommodation',
      amount: 450,
      booked: true,
    });
    const response = await request.post(`${API_URL}/expenses/`, { data: expenseData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(page.getByText('Airbnb Booking')).toBeVisible({ timeout: 15000 });

    // Verify booked status is shown (use specific locator to avoid matching form checkbox label)
    await expect(page.locator('.space-y-2').getByText('Booked')).toBeVisible();
  });

  test('should show paid status', async ({ page, request }) => {
    // Create expense with paid status via API
    const expenseData = generateExpenseData(tripId, {
      description: 'Paid Expense',
      category: 'other',
      amount: 100,
      paid: true,
    });
    const response = await request.post(`${API_URL}/expenses/`, { data: expenseData });
    expect(response.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expense to load with increased timeout
    await expect(page.getByText('Paid Expense')).toBeVisible({ timeout: 15000 });

    // Verify paid status is shown (use exact text match with emoji to target the status badge)
    await expect(page.getByText('✓ Paid')).toBeVisible();
  });

  test('should toggle booked checkbox in form', async ({ page }) => {
    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Fill required fields
    await page.getByPlaceholder('e.g., Hotel booking, Dinner').fill('Test Expense');
    await page.locator('input[type="number"]').fill('100');
    await page.locator('select').first().selectOption('other');

    // Check the booked checkbox
    await page.getByLabel('Booked').check();
    expect(await page.getByLabel('Booked').isChecked()).toBe(true);

    // Submit
    await page.getByRole('button', { name: /Add Expense/i }).click();

    // Verify booked status (use specific locator to avoid matching form checkbox label)
    await expect(page.locator('.space-y-2').getByText('Booked')).toBeVisible({ timeout: 10000 });
  });

  test('should display category breakdown in summary', async ({ page, request }) => {
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

    const resp1 = await request.post(`${API_URL}/expenses/`, { data: expense1 });
    const resp2 = await request.post(`${API_URL}/expenses/`, { data: expense2 });
    expect(resp1.ok()).toBeTruthy();
    expect(resp2.ok()).toBeTruthy();

    await page.goto(`/trips/${tripId}`);
    await page.getByRole('button', { name: /Expenses/i }).click();

    // Wait for expenses to load first
    await expect(page.getByText('Hotel')).toBeVisible({ timeout: 15000 });

    // Verify category breakdown shows both categories in the summary card
    await expect(page.locator('.bg-gradient-to-r').getByText(/Accommodation/i)).toBeVisible();
    await expect(page.locator('.bg-gradient-to-r').getByText(/Transport/i)).toBeVisible();
  });
});
