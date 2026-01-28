// lib/api.ts
import axios from 'axios';
import {
  Trip,
  Destination,
  Activity,
  Expense,
  PackingItem,
  Journey,
  TripFormData,
  DestinationFormData,
  ExpenseFormData,
  PackingItemFormData,
  ActivityFormData,
  JourneyFormData,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Trip API
export const tripApi = {
  getAll: () => api.get<Trip[]>('/trips/'),
  getById: (id: number) => api.get<Trip>(`/trips/${id}`),
  create: (data: TripFormData) => api.post<Trip>('/trips/', data),
  update: (id: number, data: Partial<TripFormData>) =>
    api.put<Trip>(`/trips/${id}`, data),
  delete: (id: number) => api.delete(`/trips/${id}`),
};

// Destination API
export const destinationApi = {
  getByTripId: (tripId: number) =>
    api.get<Destination[]>(`/trips/${tripId}/destinations/`),
  getById: (id: number) => api.get<Destination>(`/destinations/${id}`),
  create: (data: DestinationFormData) => {
    const cleanedData: Partial<DestinationFormData> = {};
    (Object.keys(data) as Array<keyof DestinationFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined) {
        cleanedData[key] = value as never;
      }
    });
    return api.post<Destination>('/destinations/', cleanedData);
  },
  update: (id: number, data: Partial<DestinationFormData>) => {
    const cleanedData: Partial<DestinationFormData> = {};
    (Object.keys(data) as Array<keyof DestinationFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined) {
        cleanedData[key] = value as never;
      }
    });
    return api.put<Destination>(`/destinations/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/destinations/${id}`),
};

// Activity API
export const activityApi = {
  getByDestinationId: (destinationId: number) =>
    api.get<Activity[]>(`/destinations/${destinationId}/activities/`),
  create: (data: ActivityFormData) => {
    const cleanedData: Partial<ActivityFormData> = {};
    (Object.keys(data) as Array<keyof ActivityFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined) {
        cleanedData[key] = value as never;
      }
    });
    return api.post<Activity>('/activities/', cleanedData);
  },
  update: (id: number, data: Partial<ActivityFormData>) => {
    const cleanedData: Partial<ActivityFormData> = {};
    (Object.keys(data) as Array<keyof ActivityFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'destination_id') return; // Don't update destination_id
      if (value !== '' && value !== undefined) {
        cleanedData[key] = value as never;
      }
    });
    return api.put<Activity>(`/activities/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/activities/${id}`),
};

// Expense API
export const expenseApi = {
  getByTripId: (tripId: number) =>
    api.get<Expense[]>(`/trips/${tripId}/expenses/`),
  create: (data: ExpenseFormData) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined) {
        // Ensure amount is a number
        if (key === 'amount' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    console.log('Expense create payload:', cleanedData);
    return api.post<Expense>('/expenses/', cleanedData);
  },
  update: (id: number, data: Partial<ExpenseFormData>) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      // Skip trip_id and date - they shouldn't be updated
      if (key === 'trip_id' || key === 'date') return;

      if (value !== '' && value !== undefined) {
        // Ensure amount is a number
        if (key === 'amount' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    console.log('Expense update payload:', cleanedData);
    return api.put<Expense>(`/expenses/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/expenses/${id}`),
};

// Packing Item API
export const packingApi = {
  getByTripId: (tripId: number) =>
    api.get<PackingItem[]>(`/trips/${tripId}/packing-items/`),
  create: (data: PackingItemFormData) =>
    api.post<PackingItem>('/packing-items/', data),
  update: (id: number, data: Partial<Omit<PackingItem, 'id'>>) =>
    api.put<PackingItem>(`/packing-items/${id}`, data),
  delete: (id: number) => api.delete(`/packing-items/${id}`),
};

// Journey API
export const journeyApi = {
  getByTripId: (tripId: number) =>
    api.get<Journey[]>(`/trips/${tripId}/journeys/`),
  getById: (id: number) => api.get<Journey>(`/journeys/${id}`),
  create: (data: JourneyFormData) => {
    const cleanedData: Partial<JourneyFormData> = {};
    (Object.keys(data) as Array<keyof JourneyFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.post<Journey>('/journeys/', cleanedData);
  },
  update: (id: number, data: Partial<JourneyFormData>) => {
    const cleanedData: Partial<JourneyFormData> = {};
    (Object.keys(data) as Array<keyof JourneyFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'trip_id') return; // Don't update trip_id
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.put<Journey>(`/journeys/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/journeys/${id}`),
};

export default api;