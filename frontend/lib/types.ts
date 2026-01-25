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
}

export interface Destination {
  id: number;
  trip_id: number;
  name: string;
  country?: string;
  arrival_date?: string;
  departure_date?: string;
  accommodation_name?: string;
  accommodation_address?: string;
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
  paid_by?: string;
}

export interface PackingItem {
  id: number;
  trip_id: number;
  item_name: string;
  category?: string;
  quantity: number;
  is_packed: boolean;
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
}