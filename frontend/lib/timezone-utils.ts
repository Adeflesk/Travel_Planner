/**
 * Timezone utilities for handling flight times across multiple time zones.
 * 
 * These utilities help convert, format, and calculate durations for journeys
 * that cross time zones, especially useful for flights.
 */

import { differenceInMinutes } from 'date-fns';
import { toDate, getTimezoneOffset } from 'date-fns-tz';

export interface Airport {
  iata: string;
  name: string;
  city: string;
  state?: string;
  country: string;
  timezone: string;
  lat?: number;
  lng?: number;
}

export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns true if `tz` is a valid IANA timezone string accepted by the
 * browser's Intl API (e.g. "America/New_York", "Europe/Dublin").
 * Rejects country-level codes like "USA", "UK", blank strings, etc.
 */
export function isValidTimezone(tz: unknown): tz is string {
  if (!tz || typeof tz !== 'string' || tz.trim() === '') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Return the timezone string if valid, otherwise return undefined.
 * Use this before storing a timezone value that came from user input or external data.
 */
export function sanitizeTimezone(tz: unknown): string | undefined {
  return isValidTimezone(tz) ? tz : undefined;
}

export function getSupportedTimezones(): string[] {
  try {
    if (typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl) {
      const values = (Intl as { supportedValuesOf?: (key: string) => string[] })
        .supportedValuesOf;
      if (values) {
        return values('timeZone');
      }
    }
  } catch {
    return ['UTC'];
  }

  return ['UTC'];
}

/**
 * Format a datetime string with timezone display
 * Example: "Jan 15, 2026, 10:30 AM PST"
 */
export function ensureUTC(dt: string): string {
  if (!dt) return dt;
  if (dt.endsWith('Z') || dt.match(/([+-]\d{2}:?\d{2})$/)) return dt;
  return `${dt}Z`;
}

export function formatDateTimeWithZone(
  datetime: string,
  timezone: string,
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string {
  // Always parse the precise visual date we stored without UTC adjustments!
  const dt = datetime.length > 16 ? datetime.substring(0, 19) : datetime;
  try {
    const { dateStyle = 'medium', timeStyle = 'short' } = options || {};
    // Fall back to just formatting perfectly without tz shift:
    return new Intl.DateTimeFormat('en-US', { dateStyle, timeStyle }).format(new Date(dt));
  } catch (error) {
    console.error('Error formatting datetime:', error);
    return datetime;
  }
}

/**
 * Get timezone abbreviation (e.g., "PST", "EST", "GMT")
 */
export function getTimezoneAbbreviation(
  datetime: string,
  timezone: string
): string {
  if (!isValidTimezone(timezone)) return '';
  try {
    const dt = datetime.length > 16 ? datetime.substring(0, 19) : datetime;
    const date = new Date(dt);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || '';
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return '';
  }
}

/**
 * Calculate duration in minutes between two datetime strings,
 * accounting for their respective timezones.
 * 
 * This properly handles timezone differences by interpreting the datetime
 * strings in their respective timezones before calculating duration.
 */
export function calculateFlightDuration(
  departureTime: string,
  arrivalTime: string,
  departureTimezone?: string,
  arrivalTimezone?: string
): number {
  try {
    const depStr = departureTime.length > 16 ? departureTime.substring(0, 19) : departureTime;
    const arrStr = arrivalTime.length > 16 ? arrivalTime.substring(0, 19) : arrivalTime;

    const departure = departureTimezone
      ? toDate(depStr, { timeZone: departureTimezone })
      : new Date(depStr);

    const arrival = arrivalTimezone
      ? toDate(arrStr, { timeZone: arrivalTimezone })
      : new Date(arrStr);

    return Math.max(0, differenceInMinutes(arrival, departure));
  } catch (error) {
    console.error('Error calculating flight duration with timezones:', error);
    return 0;
  }
}

/**
 * Format duration as "Xh Ym" or "Xm" if less than an hour
 * Example: formatDuration(125) => "2h 5m"
 */
export function formatDuration(minutes: number): string {
  if (minutes < 0) return '0m';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

/**
 * Format duration in long form
 * Example: formatDurationLong(125) => "2 hours 5 minutes"
 */
export function formatDurationLong(minutes: number): string {
  if (minutes < 0) return '0 minutes';

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const hourText = hours === 1 ? 'hour' : 'hours';
  const minText = mins === 1 ? 'minute' : 'minutes';

  if (hours === 0) return `${mins} ${minText}`;
  if (mins === 0) return `${hours} ${hourText}`;
  return `${hours} ${hourText} ${mins} ${minText}`;
}

/**
 * Calculate timezone offset difference between two timezones at a specific date
 * Returns hours difference (can be fractional for 30/45 min offsets)
 */
export function getTimezoneOffsetDifference(
  timezone1: string,
  timezone2: string,
  atDate: Date = new Date()
): number {
  try {
    const offset1 = getTimezoneOffset(timezone1, atDate) ?? 0;
    const offset2 = getTimezoneOffset(timezone2, atDate) ?? 0;
    return (offset2 - offset1) / 3600000;
  } catch (error) {
    console.error('Error calculating timezone offset:', error);
    return 0;
  }
}

/**
 * Format timezone difference for display
 * Example: formatTimezoneDifference("America/Los_Angeles", "America/New_York")
 *          => "3 hours behind"
 */
export function formatTimezoneDifference(
  fromTimezone: string,
  toTimezone: string,
  atDate: Date = new Date()
): string {
  const diff = getTimezoneOffsetDifference(fromTimezone, toTimezone, atDate);

  if (diff === 0) return 'Same timezone';

  const hours = Math.abs(diff);
  const hourText = hours === 1 ? 'hour' : 'hours';

  return diff > 0 ? `${hours} ${hourText} ahead` : `${hours} ${hourText} behind`;
}

/**
 * Parse IATA code from various input formats
 * Examples: "LAX", "lax", "LAX - Los Angeles", "(LAX)" all return "LAX"
 */
export function parseIATACode(input: string): string | null {
  if (!input) return null;

  // Extract 3-letter code
  const match = input.match(/\b([A-Z]{3})\b/i);
  return match ? match[1].toUpperCase() : null;
}

/**
 * Check if a datetime crosses midnight (next day)
 */
export function crossesMidnight(departureTime: string, arrivalTime: string): boolean {
  const departure = new Date(departureTime);
  const arrival = new Date(arrivalTime);

  return departure.getDate() !== arrival.getDate() ||
    departure.getMonth() !== arrival.getMonth() ||
    departure.getFullYear() !== arrival.getFullYear();
}

/**
 * Format flight time range with optional timezone indicators
 * Example: "10:30 AM PST → 7:45 PM EST"
 */
export function formatFlightTimeRange(
  departureTime: string,
  arrivalTime: string,
  departureTimezone: string,
  arrivalTimezone: string,
  options?: { showTimezones?: boolean; showDate?: boolean }
): string {
  const { showTimezones = true, showDate = false } = options || {};

  const depFormatted = formatDateTimeWithZone(
    departureTime,
    departureTimezone,
    { dateStyle: showDate ? 'short' : undefined, timeStyle: 'short' }
  );

  const arrFormatted = formatDateTimeWithZone(
    arrivalTime,
    arrivalTimezone,
    { dateStyle: showDate ? 'short' : undefined, timeStyle: 'short' }
  );

  if (showTimezones) {
    const depTz = getTimezoneAbbreviation(departureTime, departureTimezone);
    const arrTz = getTimezoneAbbreviation(arrivalTime, arrivalTimezone);
    return `${depFormatted} ${depTz} → ${arrFormatted} ${arrTz}`;
  }

  return `${depFormatted} → ${arrFormatted}`;
}
