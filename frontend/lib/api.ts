import axios from 'axios';
import {
  Trip,
  Destination,
  Expense,
  PackingItem,
  TripFormData,
  DestinationFormData,
  ExpenseFormData,
  PackingItemFormData,
  ExpenseSummary,
  PackingSummary,
  DestinationAccommodation,
  TripStats,
  BudgetStatusResponse,
  BudgetImpact,
  DashboardData,
  WeatherForecast,
  UserSettings,
  TripDay,
  DayActivity,
  DayActivityCreate,
  TripDayCreate,
  TripTransport,
  TripTransportCreate,
  TripTransportUpdate,
  TransportOption,
  TransportOptionCreate,
  TransportOptionUpdate,
  Accommodation,
  AccommodationCreate,
  AccommodationUpdate,
  PreTripTask,
  PreTripTaskCreate,
  PreTripTaskUpdate,
  TransportStop,
  TransportStopCreate,
  TransportStopUpdate,
  ScheduleResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const TOKEN_KEY = 'travel_planner_tokens';

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(TOKEN_KEY);
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers['Authorization']) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return config;
});

// Trip API
export const tripApi = {
  getAll: () => api.get<Trip[]>('/trips/'),
  getById: (id: number) => api.get<Trip>(`/trips/${id}`),
  create: (data: TripFormData) => api.post<Trip>('/trips/', data),
  update: (id: number, data: Partial<TripFormData>) =>
    api.put<Trip>(`/trips/${id}`, data),
  delete: (id: number) => api.delete(`/trips/${id}`),
  getAccommodationExpenses: (tripId: number) =>
    api.get<DestinationAccommodation[]>(
      `/trips/${tripId}/accommodation-expenses/`
    ),
  getStats: (tripId: number) =>
    api.get<TripStats>(`/trips/${tripId}/stats/`),
  getBudgetStatus: (tripId: number) =>
    api.get<BudgetStatusResponse>(`/trips/${tripId}/budget-status/`),
  getDays: (tripId: number) =>
    api.get<TripDay[]>(`/trip-days/trips/${tripId}/days`),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/api/dashboard'),
};

// Day Builder API
export const dayApi = {
  createDay: (data: TripDayCreate) =>
    api.post<TripDay>('/trip-days/', data),
  updateDay: (dayId: number, data: Partial<Omit<TripDayCreate, 'trip_id'>>) =>
    api.patch<TripDay>(`/trip-days/${dayId}`, data),
  deleteDay: (dayId: number) => api.delete(`/trip-days/${dayId}`),
  createActivity: (data: DayActivityCreate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof typeof data>).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (value !== '' && value !== undefined && value !== null && !Number.isNaN(value)) {
        cleanedData[key] = value;
      }
    });
    return api.post<DayActivity>('/activities/', cleanedData);
  },
  updateActivity: (id: number, data: Partial<DayActivity>) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof typeof data>).forEach((key) => {
      const value = data[key as keyof typeof data];
      if (key === 'day_id' || key === 'id') return;
      // Allow explicit null for nullable FK fields
      if (value === null && key === 'destination_id') {
        cleanedData[key] = null;
        return;
      }
      if (value !== '' && value !== undefined && value !== null && !Number.isNaN(value)) {
        cleanedData[key] = value;
      }
    });
    return api.patch<DayActivity>(`/activities/${id}`, cleanedData);
  },
  deleteActivity: (id: number) => api.delete(`/activities/${id}`),
  getActivities: (dayId: number) =>
    api.get<DayActivity[]>(`/trip-days/${dayId}/activities`),
  getByTrip: (tripId: number) =>
    api.get<DayActivity[]>(`/trips/${tripId}/activities`),
  getByDestination: (destinationId: number) =>
    api.get<DayActivity[]>(`/destinations/${destinationId}/activities`),
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

// Weather API
export const weatherApi = {
  getByDestinationId: (destinationId: number) =>
    api.get<WeatherForecast>(`/destinations/${destinationId}/weather`),
};

// Expense API
export const expenseApi = {
  getByTripId: (tripId: number) =>
    api.get<Expense[]>(`/trips/${tripId}/expenses/`),
  getSummary: (tripId: number) =>
    api.get<ExpenseSummary>(`/trips/${tripId}/expenses/summary/`),

  create: (data: ExpenseFormData) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        // Ensure amount is a number
        if (key === 'amount' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.post<Expense>('/expenses/', cleanedData);
  },
  update: (id: number, data: Partial<ExpenseFormData>) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      // Skip trip_id, date, and link fields - they shouldn't be updated
      if (key === 'trip_id' || key === 'date' || key === 'destination_id' || key === 'activity_id') return;

      if (value !== '' && value !== undefined && value !== null) {
        // Ensure amount is a number
        if (key === 'amount' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.put<Expense>(`/expenses/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/expenses/${id}`),
  checkBudget: (data: ExpenseFormData) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'amount' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.post<BudgetImpact>('/expenses/check-budget/', cleanedData);
  },
};

// Rate History API
import { TripRateSummary, GlobalRateSummary } from './types';

export const rateHistoryApi = {
  getTripSummary: (tripId: number, days = 30) =>
    api.get<TripRateSummary>(`/rate-history/trip/${tripId}?days=${days}`),
  getGlobalSummary: (days = 30) =>
    api.get<GlobalRateSummary>(`/rate-history/global?days=${days}`),
};

// Exchange Rate API
export const exchangeApi = {
  getRate: (from: string, to: string) =>
    api.get<{ rate: number | null; from: string; to: string }>(
      `/exchange-rates/pair/?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
    ),
};

// Packing Item API
export const packingApi = {
  getByTripId: (tripId: number) =>
    api.get<PackingItem[]>(`/trips/${tripId}/packing-items/`),
  getSummary: (tripId: number) =>
    api.get<PackingSummary>(`/trips/${tripId}/packing/summary/`),
  create: (data: PackingItemFormData) =>
    api.post<PackingItem>('/packing-items/', data),
  update: (id: number, data: Partial<Omit<PackingItem, 'id'>>) =>
    api.put<PackingItem>(`/packing-items/${id}`, data),
  delete: (id: number) => api.delete(`/packing-items/${id}`),
};

// Transport API
export const transportApi = {
  getByTripId: (tripId: number) =>
    api.get<TripTransport[]>(`/trips/${tripId}/transport`),
  getByDayId: (tripId: number, dayId: number) =>
    api.get<TripTransport[]>(`/trips/${tripId}/transport/day/${dayId}`),
  getById: (id: number) => api.get<TripTransport>(`/transport/${id}`),
  create: (tripId: number, data: TripTransportCreate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof TripTransportCreate>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.post<TripTransport>(`/trips/${tripId}/transport`, cleanedData);
  },
  update: (id: number, data: TripTransportUpdate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof TripTransportUpdate>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.put<TripTransport>(`/transport/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/transport/${id}`),
};

// Transport Stop API
export const transportStopApi = {
  list: (transportId: number) =>
    api.get<TransportStop[]>(`/transport/${transportId}/stops`),
  create: (transportId: number, data: TransportStopCreate) =>
    api.post<TransportStop>(`/transport/${transportId}/stops`, data),
  update: (transportId: number, stopId: number, data: TransportStopUpdate) =>
    api.put<TransportStop>(`/transport/${transportId}/stops/${stopId}`, data),
  delete: (transportId: number, stopId: number) =>
    api.delete(`/transport/${transportId}/stops/${stopId}`),
  reorder: (transportId: number, stops: { id: number; sort_order: number }[]) =>
    api.put<TransportStop[]>(`/transport/${transportId}/stops/reorder`, { stops }),
  getSchedule: (transportId: number, params: {
    departure_time: string;
    day_date: string;
    day_end_target?: string;
  }) => api.get<ScheduleResponse>(`/transport/${transportId}/schedule`, { params }),
};

// Transport Option API
export const transportOptionApi = {
  getByTransportId: (transportId: number) =>
    api.get<TransportOption[]>(`/transport/${transportId}/options`),
  create: (transportId: number, data: TransportOptionCreate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof TransportOptionCreate>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.post<TransportOption>(`/transport/${transportId}/options`, cleanedData);
  },
  update: (optionId: number, data: TransportOptionUpdate) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof TransportOptionUpdate>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.put<TransportOption>(`/transport/options/${optionId}`, cleanedData);
  },
  delete: (optionId: number) => api.delete(`/transport/options/${optionId}`),
};

// Settings API
export const settingsApi = {
  get: () => api.get<UserSettings>('/settings/'),
  update: (data: Partial<UserSettings>) => api.patch<UserSettings>('/settings/', data),
};

// Admin API
import {
  AdminStats,
  AdminUserCreate,
  AdminUserUpdate,
  User,
  TripShare,
  TripShareCreate,
} from './types';

export const adminApi = {
  getStats: () => api.get<AdminStats>('/admin/stats/'),
  getUsers: (skip = 0, limit = 100) =>
    api.get<User[]>(`/admin/users/?skip=${skip}&limit=${limit}`),
  getUser: (id: number) => api.get<User>(`/admin/users/${id}`),
  createUser: (data: AdminUserCreate) => api.post<User>('/admin/users/', data),
  updateUser: (id: number, data: AdminUserUpdate) =>
    api.patch<User>(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
};

// Trip Share API
export const tripShareApi = {
  getByTripId: (tripId: number) =>
    api.get<TripShare[]>(`/trips/${tripId}/shares/`),
  create: (tripId: number, data: TripShareCreate) =>
    api.post<TripShare>(`/trips/${tripId}/shares/`, data),
  delete: (tripId: number, shareId: number) =>
    api.delete(`/trips/${tripId}/shares/${shareId}`),
};

// Suggestion Response Interface
export interface SuggestionResponse {
  suggestions: string[];
  recent?: string[];
  popular?: string[];
}

export interface SuggestionFilters {
  category?: string;
  trip_id?: number;
}

type SuggestionType =
  | 'carriers'
  | 'locations'
  | 'expense-descriptions'
  | 'activity-names'
  | 'packing-items'
  | 'currencies';

// Suggestion API
export const suggestionApi = {
  getSuggestions: (type: SuggestionType, filters?: SuggestionFilters) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.trip_id) params.append('trip_id', filters.trip_id.toString());

    const queryString = params.toString();
    const url = `/api/suggestions/${type}${queryString ? `?${queryString}` : ''}`;

    return api.get<SuggestionResponse>(url);
  },
};

// Accommodation API
export const accommodationApi = {
  getByDestination: (tripId: number, destinationId: number) =>
    api.get<Accommodation[]>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations`
    ),
  getByTrip: (tripId: number) =>
    api.get<Accommodation[]>(`/trips/${tripId}/accommodations`),
  create: (tripId: number, destinationId: number, data: AccommodationCreate) =>
    api.post<Accommodation>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations`,
      data
    ),
  update: (
    tripId: number,
    destinationId: number,
    id: number,
    data: AccommodationUpdate
  ) =>
    api.put<Accommodation>(
      `/trips/${tripId}/destinations/${destinationId}/accommodations/${id}`,
      data
    ),
  delete: (tripId: number, destinationId: number, id: number) =>
    api.delete(
      `/trips/${tripId}/destinations/${destinationId}/accommodations/${id}`
    ),
};

// Auth API
export const authApi = {
  changePassword: (data: { current_password: string; new_password: string }) =>
    api.post('/auth/change-password', data),
  forgotPassword: (email: string) =>
    api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, new_password: string) =>
    api.post('/auth/reset-password', { token, new_password }),
};

export const timezoneApi = {
  lookup: (lat: number, lng: number) =>
    api.get<{ timezone: string | null }>(`/timezone?lat=${lat}&lng=${lng}`),
};

// Pre-Trip Task API
export const preTripApi = {
  list: (tripId: number) =>
    api.get<PreTripTask[]>(`/trips/${tripId}/pre-trip-tasks`),
  create: (tripId: number, data: PreTripTaskCreate) =>
    api.post<PreTripTask>(`/trips/${tripId}/pre-trip-tasks`, data),
  update: (taskId: number, data: PreTripTaskUpdate) =>
    api.patch<PreTripTask>(`/pre-trip-tasks/${taskId}`, data),
  remove: (taskId: number) =>
    api.delete(`/pre-trip-tasks/${taskId}`),
};

export default api;
