import { TripContext } from './trip-context';

export interface Trip {
  id: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  budget?: number;
  budget_warning_threshold?: number;
  budget_danger_threshold?: number;
  status: 'planning' | 'booked' | 'ongoing' | 'completed';
  created_at: string;
  updated_at: string;
  context?: TripContext | null;
  default_currency?: string;
  is_owner?: boolean;
  shared_by?: string;
  day_count?: number;
  total_spent?: number;
}

export interface DashboardData {
  user: {
    name: string;
  };
  next_trip: {
    id: number;
    name: string;
    start_date: string;
    days_until: number;
    destinations: string[];
    budget_used: number;
    budget_total: number;
  } | null;
  stats: {
    total_trips: number;
    countries_visited: number;
    spent_this_year: number;
    upcoming_trips: number;
  };
  action_items: Array<{
    type: 'booking' | 'packing' | 'budget' | 'deadline';
    title: string;
    trip_name: string;
    trip_id: number;
    urgency: 'low' | 'medium' | 'high';
    detail: string;
  }>;
  recent_trips: Array<{
    id: number;
    name: string;
    dates: string;
    status: 'completed' | 'in_progress';
    country_code?: string;
  }>;
}

export interface Destination {
  id: number;
  trip_id: number;
  name: string;
  country?: string;
  region?: string;
  timezone?: string;
  arrival_date?: string;
  departure_date?: string;
  notes?: string;
  order: number;
  latitude?: number;
  longitude?: number;
}

export interface Expense {
  id: number;
  trip_id: number;
  destination_id?: number | null;
  activity_id?: number | null;
  category: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  base_amount: number | null;
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

// Transport types
export type TransportType = 'flight' | 'train' | 'bus' | 'drive' | 'ferry' | 'other';
export type TransportOptionStatus = 'researching' | 'selected' | 'booked' | 'rejected';

export interface TransportOption {
  id: number;
  transport_id: number;
  transport_type: TransportType;
  name: string;
  carrier?: string;
  duration_minutes?: number;
  cost?: number;
  currency?: string;
  frequency?: string;
  booking_url?: string;
  notes?: string;
  status: TransportOptionStatus;
  extra?: Record<string, unknown>;
  order: number;
}

export interface TripTransport {
  id: number;
  trip_id: number;
  transport_type: TransportType;
  origin: string;
  destination: string;
  departure_day_id?: number;
  arrival_day_id?: number;
  departure_time?: string;
  arrival_time?: string;
  carrier?: string;
  reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  booked: boolean;
  overnight: boolean;
  sort_order: number;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  origin_timezone?: string | null;
  destination_timezone?: string | null;
  extra?: Record<string, unknown>;
  options?: TransportOption[];
}

export interface TripTransportCreate {
  transport_type: TransportType;
  origin: string;
  destination: string;
  departure_day_id?: number;
  arrival_day_id?: number;
  departure_time?: string;
  arrival_time?: string;
  carrier?: string;
  reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  booked?: boolean;
  overnight?: boolean;
  sort_order?: number;
  origin_latitude?: number;
  origin_longitude?: number;
  destination_latitude?: number;
  destination_longitude?: number;
  origin_timezone?: string | null;
  destination_timezone?: string | null;
  extra?: Record<string, unknown>;
}

export type TripTransportUpdate = Partial<TripTransportCreate>;

export interface TransportOptionCreate {
  transport_type: TransportType;
  name: string;
  carrier?: string;
  duration_minutes?: number;
  cost?: number;
  currency?: string;
  frequency?: string;
  booking_url?: string;
  notes?: string;
  status?: TransportOptionStatus;
  extra?: Record<string, unknown>;
  order?: number;
}

export type TransportOptionUpdate = Partial<TransportOptionCreate>;

export interface TripFormData {
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  budget?: number;
  budget_warning_threshold?: number;
  budget_danger_threshold?: number;
  status?: string;
  context?: TripContext | null;
  default_currency?: string;
  day_count?: number;
  total_spent?: number;
}

export interface DestinationFormData {
  trip_id: number;
  name: string;
  country?: string;
  region?: string;
  timezone?: string;
  arrival_date?: string;
  departure_date?: string;
  latitude?: number;
  longitude?: number;
}

export interface ExpenseFormData {
  trip_id: number;
  destination_id?: number | null;
  activity_id?: number | null;
  category: string;
  amount: number;
  description?: string;
  date: string;
  currency?: string;
  exchange_rate?: number | null;
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
  activities: DayActivity[];
}

export interface DestinationAccommodation {
  destination: Destination;
  expenses: Expense[];
  total: number;
}

export interface Accommodation {
  id: number;
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked: boolean;
  paid: boolean;
  notes?: string;
}

export interface AccommodationCreate {
  destination_id: number;
  trip_id: number;
  name: string;
  address?: string;
  check_in_date: string;
  check_out_date: string;
  cost?: number;
  currency?: string;
  confirmation_number?: string;
  booking_url?: string;
  contact_phone?: string;
  cancellation_policy?: string;
  cancel_by_date?: string;
  booked?: boolean;
  paid?: boolean;
  notes?: string;
}

export type AccommodationUpdate = Partial<AccommodationCreate>;

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

// Trip Statistics Types
export interface TripStatsCounts {
  destinations: number;
  activities: number;
  expenses: number;
  packing_items: number;
}

export interface TripStats {
  total_cost: number;
  transport_cost: number;
  expense_cost: number;
  days_until_departure: number | null;
  duration_days: number;
  completion_percentage: number;
  booked_transports: number;
  total_transports: number;
  packed_items: number;
  total_packing_items: number;
  counts: TripStatsCounts;
}

// Budget Types
export type BudgetStatus = 'normal' | 'warning' | 'danger' | 'over';

export interface CategoryBudget {
  category: string;
  spent: number;
  booked: number;
  estimated: number;
  percentage: number;
  status: BudgetStatus;
}

export interface BudgetAlert {
  type: 'over_budget' | 'over_category' | 'approaching_limit';
  message: string;
  category?: string;
  amount?: number;
  percentage?: number;
}

export interface BudgetStatusResponse {
  total_budget: number | null;
  total_spent: number;
  booked_amount: number;
  estimated_amount: number;
  percentage_used: number;
  remaining: number;
  status: BudgetStatus;
  by_category: CategoryBudget[];
  alerts: BudgetAlert[];
  warning_threshold: number;
  danger_threshold: number;
  base_currency: string;
}

export interface BudgetImpact {
  would_exceed: boolean;
  over_by?: number;
  new_total?: number;
  budget?: number;
  percentage?: number;
  base_currency?: string;
}


// ============== Weather ==============

export interface WeatherDay {
  date: string;
  temp_high_f: number;
  temp_low_f: number;
  temp_high_c: number;
  temp_low_c: number;
  condition: string;
  description: string;
  precipitation_chance: number;
  humidity: number;
  wind_speed_mph: number;
  wind_speed_kmh: number;
  icon: string;
}

export interface WeatherForecast {
  location: string;
  current?: WeatherDay;
  forecast: WeatherDay[];
  packing_suggestions: string[];
  cached: boolean;
}

export type TemperatureUnit = 'F' | 'C';

// Practicality Engine Types
export interface SegmentPracticality {
  segment_id: number;
  segment_type: string;
  name: string;
  duration_minutes: number;
  cost: number;
  items: string[];
}

export interface PracticalityResponse {
  journey_id: number;
  total_duration_minutes: number;
  total_cost: number;
  time_limit_minutes: number;
  daily_budget: number | null;
  time_feasible: boolean;
  budget_feasible: boolean;
  buffer_minutes_per_transition: number;
  transition_count: number;
  segments: SegmentPracticality[];
}

export interface TripDay {
  id: number;
  trip_id: number;
  date: string;
  title?: string;
  location?: string;
  notes?: string;
  sort_order: number;
  destination_id?: number | null;
  activities?: DayActivity[];
  transports?: TripTransport[];
}

export interface DayActivity {
  id: number;
  day_id?: number | null;
  destination_id?: number | null;
  start_time?: string;
  end_time?: string;
  title: string;
  category?: string;
  location?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  booked: boolean;
  sort_order: number;
  is_todo: boolean;
  is_completed: boolean;
  latitude?: number;
  longitude?: number;
}

export interface DayActivityCreate extends Partial<DayActivity> {
  title: string;
  day_id?: number | null;
  destination_id?: number | null;
}

export interface TripDayCreate {
  trip_id: number;
  date: string;
  title?: string;
  location?: string;
  notes?: string;
  destination_id?: number | null;
}

export interface UserSettings {
  id: number;
  user_id: number;
  default_currency: string;
  home_base?: string;
  feature_flags: Record<string, boolean>;
}
