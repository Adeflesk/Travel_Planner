import { test as base, expect, Page, APIResponse, request as playwrightRequest } from '@playwright/test';

// API base URL
export const API_URL = 'http://localhost:8000';

// Test data generators
export function generateTripData(overrides = {}) {
  const now = new Date();
  const startDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const endDate = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

  return {
    name: `Test Trip ${Date.now()}`,
    description: 'E2E test trip description',
    start_date: startDate.toISOString().split('T')[0],
    end_date: endDate.toISOString().split('T')[0],
    budget: 5000,
    status: 'planning',
    ...overrides,
  };
}

export function generateDestinationData(tripId: number, overrides = {}) {
  const now = new Date();
  const arrivalDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const departureDate = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);

  return {
    trip_id: tripId,
    name: `Test Destination ${Date.now()}`,
    country: 'France',
    region: 'Ile-de-France',
    arrival_date: arrivalDate.toISOString().split('T')[0],
    departure_date: departureDate.toISOString().split('T')[0],
    notes: 'E2E test destination',
    ...overrides,
  };
}

export function generateExpenseData(tripId: number, overrides = {}) {
  return {
    trip_id: tripId,
    category: 'accommodation',
    amount: 150.0,
    currency: 'USD',
    description: `Test Expense ${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    booked: false,
    paid: false,
    ...overrides,
  };
}

export function generateJourneyData(tripId: number, overrides = {}) {
  const now = new Date();
  const departureTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const arrivalTime = new Date(departureTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours later

  return {
    trip_id: tripId,
    transport_mode: 'flight',
    departure_datetime: departureTime.toISOString().slice(0, 16),
    arrival_datetime: arrivalTime.toISOString().slice(0, 16),
    carrier: 'Test Airlines',
    booking_reference: 'ABC123',
    cost: 250.0,
    currency: 'USD',
    notes: 'E2E test journey',
    status: 'planned',
    ...overrides,
  };
}

export function generateActivityData(destinationId: number, overrides = {}) {
  const now = new Date();
  const scheduledDate = new Date(now.getTime() + 8 * 24 * 60 * 60 * 1000);

  return {
    destination_id: destinationId,
    name: `Test Activity ${Date.now()}`,
    description: 'E2E test activity',
    scheduled_date: scheduledDate.toISOString().split('T')[0],
    scheduled_time: '14:00',
    duration_minutes: 120,
    cost: 50.0,
    currency: 'USD',
    is_todo: false,
    is_completed: false,
    ...overrides,
  };
}

// Type for authenticated API request function
type AuthApiRequestFn = (
  method: 'get' | 'post' | 'put' | 'delete',
  url: string,
  data?: unknown
) => Promise<APIResponse>;

// Auth tokens type (matches frontend's AuthTokens)
interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// Auth context type
interface WorkerAuthContext {
  tokens: AuthTokens;
  email: string;
}

// Extended test fixture with authentication
// Using worker-scoped fixtures to avoid rate limiting on registration
export const test = base.extend<
  {
    authenticatedPage: Page;
    authApiRequest: AuthApiRequestFn;
  },
  {
    workerAuth: WorkerAuthContext;
  }
>({
  // Worker-scoped auth - registers once per worker to avoid rate limiting
  workerAuth: [
    async ({}, use) => {
      // Create a request context for worker-scoped operations
      const requestContext = await playwrightRequest.newContext();

      // Create unique test user for this worker
      const workerId = process.env.TEST_WORKER_INDEX || String(Date.now());
      const testUser = {
        email: `testworker_${workerId}_${Date.now()}@example.com`,
        password: 'TestPassword123!',
      };

      // Register the user
      const registerResponse = await requestContext.post(`${API_URL}/auth/register`, {
        data: testUser,
      });

      if (!registerResponse.ok()) {
        const errorText = await registerResponse.text();
        // If user already exists or rate limited, try login anyway
        if (!errorText.includes('already exists')) {
          console.error('Registration failed:', errorText);
        }
      }

      // Login to get token
      const loginResponse = await requestContext.post(`${API_URL}/auth/login`, {
        data: testUser,
      });

      if (!loginResponse.ok()) {
        await requestContext.dispose();
        throw new Error(`Login failed: ${await loginResponse.text()}`);
      }

      const loginData = await loginResponse.json();
      const authContext: WorkerAuthContext = {
        tokens: {
          access_token: loginData.access_token,
          refresh_token: loginData.refresh_token,
          token_type: loginData.token_type || 'bearer',
        },
        email: testUser.email,
      };

      await use(authContext);

      // Cleanup
      await requestContext.dispose();
    },
    { scope: 'worker' },
  ],

  // Authenticated page with token in localStorage
  authenticatedPage: async ({ page, workerAuth }, use) => {
    // Setup page with auth - navigate first then set localStorage
    await page.goto('/');
    await page.evaluate((tokens) => {
      // Use the same key as the frontend auth-context.tsx
      localStorage.setItem('travel_planner_tokens', JSON.stringify(tokens));
    }, workerAuth.tokens);

    // Reload to apply auth
    await page.reload();

    // Wait for page to be ready
    await page.waitForLoadState('networkidle');

    await use(page);
  },

  // Authenticated API request helper
  authApiRequest: async ({ request, workerAuth }, use) => {
    const makeRequest: AuthApiRequestFn = async (method, url, data) => {
      const options: { headers: Record<string, string>; data?: unknown } = {
        headers: { Authorization: `Bearer ${workerAuth.tokens.access_token}` },
      };

      if (data !== undefined) {
        options.data = data;
      }

      return request[method](url, options);
    };

    await use(makeRequest);
  },
});

export { expect };
