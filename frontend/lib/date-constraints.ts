/**
 * Date constraint utilities for trip-aware date inputs.
 * Provides min/max/default values based on trip dates.
 */

/**
 * Get date input constraints for a date field within trip boundaries.
 * Returns min, max, and a smart default value.
 */
export function getDateConstraints(
  tripStartDate?: string,
  tripEndDate?: string,
  options?: {
    /** Allow dates before trip start (default: false) */
    allowBeforeStart?: boolean;
    /** Allow dates after trip end (default: false) */
    allowAfterEnd?: boolean;
    /** Default to start vs end date (default: 'start') */
    defaultTo?: 'start' | 'end';
  }
) {
  const { allowBeforeStart = false, allowAfterEnd = false, defaultTo = 'start' } = options || {};

  const constraints: {
    min?: string;
    max?: string;
    defaultValue?: string;
  } = {};

  if (tripStartDate && !allowBeforeStart) {
    constraints.min = tripStartDate;
  }

  if (tripEndDate && !allowAfterEnd) {
    constraints.max = tripEndDate;
  }

  // Smart default: use trip start or end date
  if (defaultTo === 'start' && tripStartDate) {
    constraints.defaultValue = tripStartDate;
  } else if (defaultTo === 'end' && tripEndDate) {
    constraints.defaultValue = tripEndDate;
  }

  return constraints;
}

/**
 * Get datetime-local input constraints for a datetime field within trip boundaries.
 * Returns min, max, and a smart default value with time component.
 */
export function getDateTimeConstraints(
  tripStartDate?: string,
  tripEndDate?: string,
  options?: {
    /** Allow dates before trip start (default: false) */
    allowBeforeStart?: boolean;
    /** Allow dates after trip end (default: false) */
    allowAfterEnd?: boolean;
    /** Default to start vs end date (default: 'start') */
    defaultTo?: 'start' | 'end';
    /** Default time (HH:mm format, default: '09:00') */
    defaultTime?: string;
  }
) {
  const {
    allowBeforeStart = false,
    allowAfterEnd = false,
    defaultTo = 'start',
    defaultTime = '09:00',
  } = options || {};

  const constraints: {
    min?: string;
    max?: string;
    defaultValue?: string;
  } = {};

  if (tripStartDate && !allowBeforeStart) {
    constraints.min = `${tripStartDate}T00:00`;
  }

  if (tripEndDate && !allowAfterEnd) {
    constraints.max = `${tripEndDate}T23:59`;
  }

  // Smart default: use trip start or end date with specified time
  if (defaultTo === 'start' && tripStartDate) {
    constraints.defaultValue = `${tripStartDate}T${defaultTime}`;
  } else if (defaultTo === 'end' && tripEndDate) {
    constraints.defaultValue = `${tripEndDate}T${defaultTime}`;
  }

  return constraints;
}

/**
 * Format a date string for display in a date input (YYYY-MM-DD).
 * If the date is already in the correct format, returns as-is.
 */
export function formatDateForInput(date: string | Date): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }

  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format a date string for display in a datetime-local input (YYYY-MM-DDTHH:mm).
 */
export function formatDateTimeForInput(datetime: string | Date): string {
  if (typeof datetime === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(datetime)) {
    return datetime.slice(0, 16); // Truncate to YYYY-MM-DDTHH:mm
  }

  const d = typeof datetime === 'string' ? new Date(datetime) : datetime;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hour}:${minute}`;
}
