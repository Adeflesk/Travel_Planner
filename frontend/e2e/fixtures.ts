import { test as base, expect, APIRequestContext } from '@playwright/test';

// API base URL
const API_URL = 'http://localhost:8000';

// Helper functions for API cleanup
export async function deleteAllTrips(request: APIRequestContext) {
  const response = await request.get(`${API_URL}/trips/`);
  const trips = await response.json();
  for (const trip of trips) {
    await request.delete(`${API_URL}/trips/${trip.id}`);
  }
}

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

// Extended test with cleanup fixture
export const test = base.extend<{ cleanupTrips: void }>({
  cleanupTrips: async ({ request }, use) => {
    // Setup: nothing to do
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use();
    // Teardown: cleanup all trips after each test
    const response = await request.get(`${API_URL}/trips/`);
    if (response.ok()) {
      const trips = await response.json();
      for (const trip of trips) {
        await request.delete(`${API_URL}/trips/${trip.id}`);
      }
    }
  },
});

export { expect };
