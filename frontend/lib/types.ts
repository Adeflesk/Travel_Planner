// lib/types.ts
export interface Trip {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget?: number;
  status: 'planning' | 'booked' | 'ongoing' | 'completed';
  created_at: string;
  updated_at: string;
  is_owner?: boolean;
  shared_by?: string;
}

export interface Destination {
  id: number;
  trip_id: number;
  name: string;
  country?: string;
  region?: string;
  arrival_date?: string;
  departure_date?: string;
  notes?: string;
  order: number;
}

export interface Activity {
  id: number;
  destination_id: number;
  name: string;
  description?: string;
  activity_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration?: number;
  cost?: number;
  booking_reference?: string;
  status: 'planned' | 'booked' | 'completed';
  priority?: number;
  is_todo: boolean;
  is_completed: boolean;
}

export interface Expense {
  id: number;
  trip_id: number;
  destination_id?: number;
  activity_id?: number;
  category: string;
  amount: number;
  currency: string;
  description?: string;
  date: string;
  booked: boolean;
  paid: boolean;
  cancel_by_date?: string;
}

export interface PackingItem {
  id: number;
  trip_id: number;
  item_name: string;
  category?: string;
  quantity: number;
  is_packed: boolean;
}

export interface Journey {
  id: number;
  trip_id: number;
  origin_id?: number;
  destination_id?: number;
  transport_mode: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  carrier?: string;
  booking_reference?: string;
  cost?: number;
  currency: string;
  notes?: string;
  status: 'planned' | 'booked' | 'completed';
  order: number;
}

export interface TripFormData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget?: number;
  status?: string;
}

export interface DestinationFormData {
  trip_id: number;
  name: string;
  country?: string;
  region?: string;
  arrival_date?: string;
  departure_date?: string;
}

export interface ExpenseFormData {
  trip_id: number;
  category: string;
  amount: number;
  description?: string;
  date: string;
  currency?: string;
  booked?: boolean;
  paid?: boolean;
  cancel_by_date?: string;
}

export interface PackingItemFormData {
  trip_id: number;
  item_name: string;
  category?: string;
  quantity?: number;
}

export interface ActivityFormData {
  destination_id: number;
  name: string;
  description?: string;
  activity_type?: string;
  scheduled_date?: string;
  scheduled_time?: string;
  duration?: number;
  cost?: number;
  booking_reference?: string;
  status?: string;
  priority?: number;
  is_todo?: boolean;
  is_completed?: boolean;
}

export interface JourneyFormData {
  trip_id: number;
  origin_id?: number;
  destination_id?: number;
  transport_mode: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  carrier?: string;
  booking_reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  status?: string;
  order?: number;
}

// Summary Types
export interface ExpenseSummary {
  total: number;
  paid_total: number;
  unpaid_total: number;
  by_category: Record<string, number>;
  count: number;
}

export interface PackingCategoryDetail {
  total: number;
  packed: number;
  items: PackingItem[];
}

export interface PackingSummary {
  total_items: number;
  packed_items: number;
  progress_percent: number;
  by_category: Record<string, PackingCategoryDetail>;
}

export interface TripProgress {
  total_activities: number;
  completed_activities: number;
  progress_percent: number;
}

export interface DestinationWithActivities {
  destination: Destination;
  activities: Activity[];
}

export interface TimelineItem {
  type: 'destination' | 'journey';
  sort_date: string | null;
  destination?: Destination;
  journey?: Journey;
}

export interface DestinationAccommodation {
  destination: Destination;
  expenses: Expense[];
  total: number;
}

// Auth Types
export interface User {
  id: number;
  email: string;
  full_name?: string;
  role: 'admin' | 'user';
  is_active: boolean;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name?: string;
}

// Admin Types
export interface AdminStats {
  total_users: number;
  active_users: number;
  inactive_users: number;
  total_trips: number;
}

export interface AdminUserCreate {
  email: string;
  password: string;
  full_name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface AdminUserUpdate {
  email?: string;
  full_name?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

// Trip Sharing Types
export interface TripShare {
  id: number;
  trip_id: number;
  user_id: number;
  permission: 'view' | 'edit';
  created_at: string;
  user_email?: string;
}

export interface TripShareCreate {
  email: string;
}