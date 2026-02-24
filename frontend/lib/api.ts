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
  JourneySegment,
  SegmentOption,
  SegmentOptionFormData,
  ExpenseSummary,
  PackingSummary,
  TripProgress,
  DestinationWithActivities,
  AdminStats,
  AdminUserCreate,
  AdminUserUpdate,
  User,
  TripShare,
  TripShareCreate,
  TimelineItem,
  DestinationAccommodation,
  TripStats,
  BudgetStatusResponse,
  BudgetImpact,
  DashboardData,
  JourneyTimelineResponse,
  WeatherForecast,
  PracticalityResponse,
  UserSettings,
  TripDay,
  DayActivity,
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
  getDays: (tripId: number) =>
    api.get<TripDay[]>(`/trip-days/trips/${tripId}/days`),
};

// Day Builder API
export const dayApi = {
  createDay: (data: { trip_id: number; date: string; title?: string; location?: string; notes?: string }) =>
    api.post<TripDay>('/trip-days/', data),
  deleteDay: (dayId: number) => api.delete(`/trip-days/${dayId}`),
  getActivities: (dayId: number) => api.get<DayActivity[]>(`/trip-days/${dayId}/activities`),
  createActivity: (data: Partial<DayActivity> & { day_id: number }) =>
    api.post<DayActivity>('/trip-days/activities', data),
  updateActivity: (activityId: number, data: Partial<DayActivity>) =>
    api.patch<DayActivity>(`/trip-days/activities/${activityId}`, data),
  deleteActivity: (activityId: number) => api.delete(`/trip-days/activities/${activityId}`),
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
  checkBudget: (data: ExpenseFormData) => {
    const cleanedData: Partial<ExpenseFormData> = {};
    (Object.keys(data) as Array<keyof ExpenseFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined) {
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
  create: async (data: JourneyFormData): Promise<{ data: Journey }> => {
    // Phase 1: build journey-only payload (no segments — they are a relationship, not a column)
    const { segments, ...journeyFields } = data;
    const cleanedJourney: Record<string, unknown> = {};
    (Object.keys(journeyFields) as Array<keyof typeof journeyFields>).forEach((key) => {
      const value = journeyFields[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedJourney[key] = parseFloat(value);
        } else {
          cleanedJourney[key] = value;
        }
      }
    });

    const journeyRes = await api.post<Journey>('/journeys/', cleanedJourney);
    const journeyId = journeyRes.data.id;

    // Phase 2: create each segment individually, flattening origin/destination objects
    if (segments && segments.length > 0) {
      await Promise.all(
        segments.map((seg, i) => {
          const segPayload: Record<string, unknown> = {
            journey_id: journeyId,
            segment_type: seg.segment_type,
            order: seg.order ?? i,
          };
          // Flatten LocationRef → flat name/id fields
          if (seg.origin.destination_id) {
            segPayload.origin_id = seg.origin.destination_id;
          } else if (seg.origin.name) {
            segPayload.origin_name = seg.origin.name;
          }
          if (seg.destination.destination_id) {
            segPayload.destination_id = seg.destination.destination_id;
          } else if (seg.destination.name) {
            segPayload.destination_name = seg.destination.name;
          }
          if (seg.start_datetime) segPayload.start_datetime = seg.start_datetime;
          if (seg.end_datetime) segPayload.end_datetime = seg.end_datetime;
          if (seg.origin_timezone) segPayload.origin_timezone = seg.origin_timezone;
          if (seg.destination_timezone) segPayload.destination_timezone = seg.destination_timezone;
          if (seg.metadata && Object.keys(seg.metadata).length > 0) {
            segPayload.metadata = seg.metadata;
          }
          return api.post<JourneySegment>(`/journeys/${journeyId}/segments`, segPayload);
        })
      );

      // Phase 3: patch the journey's origin_name / destination_name from first → last segment
      // so the journey card title shows "Glenflesk → Denver Inn" instead of "Unknown → Unknown"
      const ordered = [...segments].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      const first = ordered[0];
      const last = ordered[ordered.length - 1];

      const derivedOriginName = first.origin.name || undefined;
      const derivedOriginId = first.origin.destination_id || undefined;
      const derivedDestName = last.destination.name || undefined;
      const derivedDestId = last.destination.destination_id || undefined;

      // Only patch if the journey doesn't already have explicit names/ids set
      const needsPatch =
        !journeyRes.data.origin_name && !journeyRes.data.origin_id &&
        (derivedOriginName || derivedOriginId || derivedDestName || derivedDestId);

      if (needsPatch) {
        const patch: Record<string, unknown> = {};
        if (derivedOriginId) patch.origin_id = derivedOriginId;
        if (derivedOriginName && !derivedOriginId) patch.origin_name = derivedOriginName;
        if (derivedDestId) patch.destination_id = derivedDestId;
        if (derivedDestName && !derivedDestId) patch.destination_name = derivedDestName;

        const patchedRes = await api.put<Journey>(`/journeys/${journeyId}`, patch);
        return patchedRes;
      }
    }

    return journeyRes;
  },

  update: async (id: number, data: Partial<JourneyFormData>) => {
    // If segments are provided, they are handled separately or ignored in the basic PUT
    const { segments: _unused_segments, ...updateFields } = data;
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(updateFields) as Array<keyof typeof updateFields>).forEach((key) => {
      const value = updateFields[key];
      if (key === 'trip_id') return; // Don't update trip_id
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.put<Journey>(`/journeys/${id}`, cleanedData);
  },
  delete: (id: number) => api.delete(`/journeys/${id}`),
  getTimeline: (journeyId: number) =>
    api.get<JourneyTimelineResponse>(`/journeys/${journeyId}/timeline`),
  getPracticality: (journeyId: number, params?: { time_limit_minutes?: number; buffer_minutes?: number }) =>
    api.get<PracticalityResponse>(`/journeys/${journeyId}/practicality`, { params }),
};

export const journeySegmentApi = {
  getByJourneyId: (journeyId: number) =>
    api.get<JourneySegment[]>(`/journeys/${journeyId}/segments`),
  getById: (segmentId: number) =>
    api.get<JourneySegment>(`/journey-segments/${segmentId}`),
  create: (journeyId: number, data: Omit<JourneySegment, 'id'>) =>
    api.post<JourneySegment>(`/journeys/${journeyId}/segments`, data),
  update: (segmentId: number, data: Partial<JourneySegment>) =>
    api.put<JourneySegment>(`/journey-segments/${segmentId}`, data),
  delete: (segmentId: number) => api.delete(`/journey-segments/${segmentId}`),
};

// Segment Option API
export const segmentOptionApi = {
  getBySegmentId: (segmentId: number) =>
    api.get<SegmentOption[]>(`/segment-options/segment/${segmentId}`),
  getById: (optionId: number) =>
    api.get<SegmentOption>(`/segment-options/${optionId}`),
  create: (data: SegmentOptionFormData) => {
    const cleanedData: Partial<SegmentOptionFormData> = {};
    (Object.keys(data) as Array<keyof SegmentOptionFormData>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.post<SegmentOption>('/segment-options/', cleanedData);
  },
  update: (optionId: number, data: Partial<SegmentOptionFormData>) => {
    const cleanedData: Partial<SegmentOptionFormData> = {};
    (Object.keys(data) as Array<keyof SegmentOptionFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'segment_id') return; // Don't update segment_id
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value) as never;
        } else {
          cleanedData[key] = value as never;
        }
      }
    });
    return api.put<SegmentOption>(`/segment-options/${optionId}`, cleanedData);
  },
  delete: (optionId: number) => api.delete(`/segment-options/${optionId}`),
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

// Segment Stop Option API (stop options attached to STOP-type segments)
export const segmentStopOptionApi = {
  getBySegmentId: (segmentId: number) =>
    api.get<StopOption[]>(`/segments/${segmentId}/stop-options/`),
  create: (segmentId: number, data: Omit<StopOptionFormData, 'stop_id' | 'segment_id'>) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof typeof data>).forEach((key) => {
      const value = data[key];
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'estimated_cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.post<StopOption>(`/segments/${segmentId}/stop-options/`, cleanedData);
  },
  update: (segmentId: number, optionId: number, data: Partial<StopOptionFormData>) => {
    const cleanedData: Record<string, unknown> = {};
    (Object.keys(data) as Array<keyof StopOptionFormData>).forEach((key) => {
      const value = data[key];
      if (key === 'stop_id' || key === 'segment_id') return;
      if (value !== '' && value !== undefined && value !== null) {
        if (key === 'estimated_cost' && typeof value === 'string') {
          cleanedData[key] = parseFloat(value);
        } else {
          cleanedData[key] = value;
        }
      }
    });
    return api.put<StopOption>(`/segments/${segmentId}/stop-options/${optionId}`, cleanedData);
  },
  delete: (segmentId: number, optionId: number) =>
    api.delete(`/segments/${segmentId}/stop-options/${optionId}`),
  updateStatus: (segmentId: number, optionId: number, status: StopOptionStatus) =>
    api.patch<StopOption>(`/segments/${segmentId}/stop-options/${optionId}/status`, { status }),
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

// Settings API
export const settingsApi = {
  get: () => api.get<UserSettings>('/settings/'),
  update: (data: Partial<UserSettings>) => {
    console.log('Sending PATCH /settings/ with:', data);
    return api.patch<UserSettings>('/settings/', data);
  },
};

// Admin API
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

export default api;
