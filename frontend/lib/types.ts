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
  is_owner?: boolean;
  shared_by?: string;
  journey_count?: number;
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
  segment_option_id?: number;
  stop_option_id?: number;
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

// Route type options for journeys
export type RouteType = 'fastest' | 'shortest' | 'scenic' | 'avoid_highways' | 'avoid_tolls';

export interface Journey {
  id: number;
  trip_id: number;
  origin_id?: number;
  destination_id?: number;
  // Text fields for locations not in destinations (e.g., home airport)
  origin_name?: string;
  destination_name?: string;
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
  origin_timezone?: string;
  destination_timezone?: string;
  // Route details (for road trips)
  distance_km?: number;
  distance_miles?: number;
  estimated_duration_minutes?: number;
  route_type?: RouteType;
  has_tolls?: boolean;
  toll_cost?: number;
  route_notes?: string;
}

export type JourneyTimelineItemType = 'stop' | 'activity';

export interface JourneyTimelineStop {
  type: 'stop';
  id: number;
  journey_id: number;
  name: string;
  location?: string;
  planned_arrival?: string;
  planned_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  notes?: string;
  order: number;
}

export interface JourneyTimelineActivity {
  type: 'activity';
  id: number;
  stop_id: number;
  name: string;
  description?: string;
  option_type: StopOptionType;
  estimated_duration?: number;
  estimated_cost?: number;
  currency: string;
  url?: string;
  notes?: string;
  status: StopOptionStatus;
  order: number;
}

export type JourneyTimelineItem = JourneyTimelineStop | JourneyTimelineActivity;

export interface JourneyTimelineResponse {
  journey_id: number;
  items: JourneyTimelineItem[];
}

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
  journey_count?: number;
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
}

export interface ExpenseFormData {
  trip_id: number;
  destination_id?: number;
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
  notes?: string;
  status?: string;
  priority?: number;
  is_todo?: boolean;
  is_completed?: boolean;
}

export interface JourneyFormData {
  trip_id: number;
  origin_id?: number;
  destination_id?: number;
  // Text fields for locations not in destinations (e.g., home airport)
  origin_name?: string;
  destination_name?: string;
  transport_mode: string;
  departure_datetime?: string;
  arrival_datetime?: string;
  origin_timezone?: string;
  destination_timezone?: string;
  carrier?: string;
  booking_reference?: string;
  cost?: number;
  currency?: string;
  notes?: string;
  status?: string;
  order?: number;
  // Route details
  distance_km?: number;
  distance_miles?: number;
  estimated_duration_minutes?: number;
  route_type?: RouteType;
  has_tolls?: boolean;
  toll_cost?: number;
  route_notes?: string;
  segments?: JourneySegmentDraft[];
}

export type JourneySegmentIntent = 'SIMPLE' | 'AIR_TRAVEL' | 'AIR_LAYOVER' | 'MULTI_STOP' | 'ROAD_TRIP' | 'ROAD_TRIP_WITH_STOPS';

export type SegmentType = 'TRANSFER' | 'LEG' | 'BUS' | 'RAIL' | 'FLIGHT' | 'LAYOVER' | 'STOP';

export interface JourneySegment {
  id: number;
  journey_id: number;
  segment_type: SegmentType;
  origin_id?: number;
  origin_name?: string;
  destination_id?: number;
  destination_name?: string;
  start_datetime?: string;
  end_datetime?: string;
  origin_timezone?: string;
  destination_timezone?: string;
  metadata?: Record<string, unknown>;
  order: number;
}

export interface LocationRef {
  type: 'custom' | 'destination';
  destination_id?: number;
  name?: string;
}

export interface JourneySegmentDraft {
  segment_type: SegmentType;
  origin: LocationRef;
  destination: LocationRef;
  order: number;
  start_datetime?: string;
  end_datetime?: string;
  origin_timezone?: string;
  destination_timezone?: string;
  metadata?: Record<string, unknown>;
  notes?: string;
}

// Segment Option Types
export type SegmentOptionStatus = 'researching' | 'selected' | 'booked' | 'rejected';

export interface SegmentOption {
  id: number;
  segment_id: number;
  name: string;
  provider?: string;
  frequency?: string;
  estimated_duration?: number;  // Duration in minutes
  cost?: number;
  currency: string;
  booking_url?: string;
  notes?: string;
  status: SegmentOptionStatus;
  order: number;
}

export interface SegmentOptionFormData {
  segment_id: number;
  name: string;
  provider?: string;
  frequency?: string;
  estimated_duration?: number;
  cost?: number;
  currency?: string;
  booking_url?: string;
  notes?: string;
  status?: SegmentOptionStatus;
  order?: number;
}

// Journey Stop Types
export type StopOptionType = 'activity' | 'meal' | 'sightseeing' | 'rest' | 'fuel' | 'shopping' | 'other';
export type StopOptionStatus = 'considering' | 'selected' | 'skipped' | 'done';

export interface JourneyStop {
  id: number;
  journey_id: number;
  name: string;
  location?: string;
  planned_arrival?: string;
  planned_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  notes?: string;
  order: number;
}

export interface JourneyStopWithOptions extends JourneyStop {
  options: StopOption[];
}

export interface JourneyStopFormData {
  journey_id: number;
  name: string;
  location?: string;
  planned_arrival?: string;
  planned_departure?: string;
  actual_arrival?: string;
  actual_departure?: string;
  notes?: string;
  order?: number;
}

export interface StopOption {
  id: number;
  stop_id?: number;
  segment_id?: number;
  name: string;
  description?: string;
  option_type: StopOptionType;
  estimated_duration?: number;  // Duration in minutes
  estimated_cost?: number;
  currency: string;
  url?: string;
  notes?: string;
  status: StopOptionStatus;
  order: number;
}

export interface StopOptionFormData {
  stop_id?: number;
  segment_id?: number;
  name: string;
  description?: string;
  option_type?: StopOptionType;
  estimated_duration?: number;
  estimated_cost?: number;
  currency?: string;
  url?: string;
  notes?: string;
  status?: StopOptionStatus;
  order?: number;
}

// Journey Document Types
export type DocumentType = 'ticket' | 'confirmation' | 'rental' | 'map' | 'visa' | 'insurance' | 'other';

export interface JourneyDocument {
  id: number;
  journey_id: number;
  name: string;
  document_type: DocumentType;
  file_path?: string;
  url?: string;
  notes?: string;
  created_at: string;
}

export interface JourneyDocumentFormData {
  journey_id: number;
  name: string;
  document_type?: DocumentType;
  url?: string;
  notes?: string;
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

// Trip Statistics Types
export interface TripStatsCounts {
  destinations: number;
  journeys: number;
  activities: number;
  expenses: number;
  packing_items: number;
}

export interface TripStats {
  total_cost: number;
  journey_cost: number;
  expense_cost: number;
  days_until_departure: number | null;
  duration_days: number;
  completion_percentage: number;
  booked_journeys: number;
  total_journeys: number;
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
}

export interface BudgetImpact {
  would_exceed: boolean;
  over_by?: number;
  new_total?: number;
  budget?: number;
  percentage?: number;
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
  activities?: DayActivity[];
}

export interface DayActivity {
  id: number;
  day_id: number;
  start_time: string;
  end_time?: string;
  title: string;
  category?: string;
  location?: string;
  notes?: string;
  cost?: number;
  currency?: string;
  booked: boolean;
  sort_order: number;
}

export interface UserSettings {
  id: number;
  user_id: number;
  default_currency: string;
  home_base?: string;
  feature_flags: Record<string, boolean>;
}

