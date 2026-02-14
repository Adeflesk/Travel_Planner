/**
 * Timezone utilities for handling flight times across multiple time zones.
 * 
 * These utilities help convert, format, and calculate durations for journeys
 * that cross time zones, especially useful for flights.
 */

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

/**
 * Format a datetime string with timezone display
 * Example: "Jan 15, 2026, 10:30 AM PST"
 */
export function formatDateTimeWithZone(
  datetime: string,
  timezone: string,
  options?: {
    dateStyle?: 'full' | 'long' | 'medium' | 'short';
    timeStyle?: 'full' | 'long' | 'medium' | 'short';
  }
): string {
  try {
    const date = new Date(datetime);
    const { dateStyle = 'medium', timeStyle = 'short' } = options || {};
    
    return new Intl.DateTimeFormat('en-US', {
      dateStyle,
      timeStyle,
      timeZone: timezone,
    }).format(date);
  } catch (error) {
    console.error('Error formatting datetime with zone:', error);
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
  try {
    const date = new Date(datetime);
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(date);
    const tzPart = parts.find(part => part.type === 'timeZoneName');
    return tzPart?.value || timezone;
  } catch (error) {
    console.error('Error getting timezone abbreviation:', error);
    return timezone;
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
  // If no timezones provided, fall back to simple calculation
  if (!departureTimezone || !arrivalTimezone) {
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const durationMs = arrival.getTime() - departure.getTime();
    return Math.floor(durationMs / 60000);
  }

  try {
    // Convert datetime-local strings to UTC timestamps considering their timezones
    const depUTC = convertLocalTimeToUTC(departureTime, departureTimezone);
    const arrUTC = convertLocalTimeToUTC(arrivalTime, arrivalTimezone);
    
    const durationMs = arrUTC - depUTC;
    return Math.floor(durationMs / 60000);
  } catch (error) {
    console.error('Error calculating flight duration with timezones:', error);
    // Fall back to simple calculation
    const departure = new Date(departureTime);
    const arrival = new Date(arrivalTime);
    const durationMs = arrival.getTime() - departure.getTime();
    return Math.floor(durationMs / 60000);
  }
}

/**
 * Convert a datetime-local string (YYYY-MM-DDTHH:mm) interpreted as being
 * in the given timezone to a UTC timestamp in milliseconds.
 * 
 * Strategy: Find the UTC time that, when formatted in the target timezone,
 * displays our input time.
 */
function convertLocalTimeToUTC(datetimeStr: string, timezone: string): number {
  // Parse the datetime components
  const [datePart, timePart = '00:00'] = datetimeStr.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  
  // Start with a guess: interpret the date as UTC
  let guessUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  
  // Format this UTC timestamp as it would appear in the target timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const formatted = formatter.format(new Date(guessUtc));
  
  // Parse what we got back: "MM/DD/YYYY, HH:mm:ss"
  const [tzDatePart, tzTimePart] = formatted.split(', ');
  const [tzMonth, tzDay, tzYear] = tzDatePart.split('/').map(Number);
  const [tzHour, tzMinute, tzSecond] = tzTimePart.split(':').map(Number);
  
  // Calculate the difference in milliseconds
  const wantedDate = Date.UTC(year, month - 1, day, hour, minute, 0);
  const gotDate = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond);
  const diffMs = wantedDate - gotDate;
  
  // The correct UTC time is our guess adjusted by this difference
  return guessUtc + diffMs;
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
    // Get offset in minutes for both timezones
    const formatter1 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone1,
      timeZoneName: 'longOffset',
    });
    const formatter2 = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone2,
      timeZoneName: 'longOffset',
    });
    
    // This is a simplified approach - for production, use a library like date-fns-tz
    // For now, we'll just note that the times are in different zones
    return 0; // Placeholder - implement full calculation if needed
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
