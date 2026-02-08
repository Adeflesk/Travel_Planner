// lib/api.ts
import axios from 'axios';
import {
  Trip,
  Destination,
  Activity,
  Expense,
  PackingItem,
  Journey,
  JourneyStop,
  JourneyStopWithOptions,
  JourneyStopFormData,
  StopOption,
  StopOptionFormData,
  StopOptionStatus,
  JourneyDocument,
  JourneyDocumentFormData,
  TripFormData,
  DestinationFormData,
  ExpenseFormData,
  PackingItemFormData,
  ActivityFormData,
  JourneyFormData,
  ExpenseSummary,
  PackingSummary,
  TripProgress,
  DestinationWithActivities,
  TimelineItem,
  DestinationAccommodation,
  TripStats,
  BudgetStatusResponse,
  DashboardData,
  JourneyTimelineResponse,
  WeatherForecast,
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
  getProgress: (tripId: number) =>
    api.get<TripProgress>(`/trips/${tripId}/progress/`),
  getDestinationsWithActivities: (tripId: number) =>
    api.get<DestinationWithActivities[]>(
      `/trips/${tripId}/destinations-with-activities/`
    ),
  getTimeline: (tripId: number) =>
    api.get<TimelineItem[]>(`/trips/${tripId}/timeline/`),
  getAccommodationExpenses: (tripId: number) =>
    api.get<DestinationAccommodation[]>(
      `/trips/${tripId}/accommodation-expenses/`
    ),
  getStats: (tripId: number) =>
    api.get<TripStats>(`/trips/${tripId}/stats/`),
  getBudgetStatus: (tripId: number) =>
    api.get<BudgetStatusResponse>(`/trips/${tripId}/budget-status/`),
};

export const dashboardApi = {
  get: () => api.get<DashboardData>('/api/dashboard'),
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
  getSummary: (tripId: number) =>
    api.get<ExpenseSummary>(`/trips/${tripId}/expenses/summary/`),
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
  getSummary: (tripId: number) =>
    api.get<PackingSummary>(`/trips/${tripId}/packing/summary/`),
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
  getTimeline: (journeyId: number) =>
    api.get<JourneyTimelineResponse>(`/journeys/${journeyId}/timeline`),
};

// Journey Stop API
export const journeyStopApi = {
  getByJourneyId: (journeyId: number) =>
    api.get<JourneyStop[]>(`/journeys/${journeyId}/stops/`),
  getById: (journeyId: number, stopId: number) =>
    api.get<JourneyStopWithOptions>(`/journeys/${journeyId}/stops/${stopId}`),
  create: (data: JourneyStopFormData) => {
    const cleanedData: Partial<JourneyStopFormData> = {};
    (Object.keys(data) as Array<keyof JourneyStopFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        cleanedData[key] = value as never;
      }
    });
    return api.post<JourneyStop>(`/journeys/${data.journey_id}/stops/`, cleanedData);
  },
  update: (journeyId: number, stopId: number, data: Partial<JourneyStopFormData>) => {
    const cleanedData: Partial<JourneyStopFormData> = {};
    (Object.keys(data) as Array<keyof JourneyStopFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'journey_id') return; // Don't update journey_id
      if (value !== '' && value !== undefined && value !== null) {
        cleanedData[key] = value as never;
      }
    });
    return api.put<JourneyStop>(`/journeys/${journeyId}/stops/${stopId}`, cleanedData);
  },
  delete: (journeyId: number, stopId: number) =>
    api.delete(`/journeys/${journeyId}/stops/${stopId}`),
  reorder: (journeyId: number, stopIds: number[]) =>
    api.patch<JourneyStop[]>(`/journeys/${journeyId}/stops/reorder`, { stop_ids: stopIds }),
};

// Stop Option API
export const stopOptionApi = {
  getByStopId: (stopId: number) =>
    api.get<StopOption[]>(`/stops/${stopId}/options/`),
  getById: (stopId: number, optionId: number) =>
    api.get<StopOption>(`/stops/${stopId}/options/${optionId}`),
  create: (data: StopOptionFormData) => {
    const cleanedData: Partial<StopOptionFormData> = {};
    (Object.keys(data) as Array<keyof StopOptionFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'estimated_cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.post<StopOption>(`/stops/${data.stop_id}/options/`, cleanedData);
  },
  update: (stopId: number, optionId: number, data: Partial<StopOptionFormData>) => {
    const cleanedData: Partial<StopOptionFormData> = {};
    (Object.keys(data) as Array<keyof StopOptionFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'stop_id') return; // Don't update stop_id
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'estimated_cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.put<StopOption>(`/stops/${stopId}/options/${optionId}`, cleanedData);
  },
  delete: (stopId: number, optionId: number) =>
    api.delete(`/stops/${stopId}/options/${optionId}`),
  updateStatus: (stopId: number, optionId: number, status: StopOptionStatus) =>
    api.patch<StopOption>(`/stops/${stopId}/options/${optionId}/status`, { status }),
};

// Journey Document API
export const journeyDocumentApi = {
  getByJourneyId: (journeyId: number) =>
    api.get<JourneyDocument[]>(`/journeys/${journeyId}/documents/`),
  getById: (journeyId: number, documentId: number) =>
    api.get<JourneyDocument>(`/journeys/${journeyId}/documents/${documentId}`),
  create: (data: JourneyDocumentFormData) => {
    const cleanedData: Partial<JourneyDocumentFormData> = {};
    (Object.keys(data) as Array<keyof JourneyDocumentFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        cleanedData[key] = value as never;
      }
    });
    return api.post<JourneyDocument>(`/journeys/${data.journey_id}/documents/`, cleanedData);
  },
  upload: (journeyId: number, file: File, name: string, documentType: string, notes?: string) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', name);
    formData.append('document_type', documentType);
    if (notes) formData.append('notes', notes);
    return api.post<JourneyDocument>(`/journeys/${journeyId}/documents/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  update: (journeyId: number, documentId: number, data: Partial<JourneyDocumentFormData>) => {
    const cleanedData: Partial<JourneyDocumentFormData> = {};
    (Object.keys(data) as Array<keyof JourneyDocumentFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'journey_id') return;
      if (value !== '' && value !== undefined && value !== null) {
        cleanedData[key] = value as never;
      }
    });
    return api.put<JourneyDocument>(`/journeys/${journeyId}/documents/${documentId}`, cleanedData);
  },
  delete: (journeyId: number, documentId: number) =>
    api.delete(`/journeys/${journeyId}/documents/${documentId}`),
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

export default api;
