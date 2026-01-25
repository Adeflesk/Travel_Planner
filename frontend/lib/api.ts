// lib/api.ts
import axios from 'axios';
import {
  Trip,
  Destination,
  Activity,
  Expense,
  PackingItem,
  TripFormData,
  DestinationFormData,
  ExpenseFormData,
  PackingItemFormData,
  ActivityFormData,
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
  create: (data: DestinationFormData) =>
    api.post<Destination>('/destinations/', data),
  update: (id: number, data: Partial<DestinationFormData>) =>
    api.put<Destination>(`/destinations/${id}`, data),
  delete: (id: number) => api.delete(`/destinations/${id}`),
};

// Activity API
export const activityApi = {
  getByDestinationId: (destinationId: number) =>
    api.get<Activity[]>(`/destinations/${destinationId}/activities/`),
  create: (data: ActivityFormData) => api.post<Activity>('/activities/', data),
  update: (id: number, data: Partial<ActivityFormData>) =>
    api.put<Activity>(`/activities/${id}`, data),
  delete: (id: number) => api.delete(`/activities/${id}`),
};

// Expense API
export const expenseApi = {
  getByTripId: (tripId: number) =>
    api.get<Expense[]>(`/trips/${tripId}/expenses/`),
  create: (data: ExpenseFormData) =>
    api.post<Expense>('/expenses/', data),
  update: (id: number, data: Partial<ExpenseFormData>) =>
    api.put<Expense>(`/expenses/${id}`, data),
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

export default api;