import { addHours as dfAddHours, parseISO, formatISO, format, isValid } from 'date-fns';

export const DEFAULT_SEGMENT_DURATION_HOURS = 2;

/** Add `hours` to an ISO 8601 string and return a new ISO 8601 string. */
export const addHoursToISO = (iso: string, hours: number): string =>
  formatISO(dfAddHours(parseISO(iso), hours));

/** Add `hours` to an ISO 8601 string and return a new ISO 8601 string. (Legacy exported name for compatibility) */
export const addHours = addHoursToISO;

export const defaultEndTime = (
  startIso: string,
  durationHours: number = DEFAULT_SEGMENT_DURATION_HOURS
): string => addHoursToISO(startIso, durationHours);

export const toDatetimeLocal = (isoString?: string): string => {
  if (!isoString) return '';
  try {
    const parsed = parseISO(isoString);
    if (!isValid(parsed)) return '';
    return format(parsed, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
};

export const fromDatetimeLocal = (localString?: string, fallbackTimezone?: string): string | undefined => {
  if (!localString) return undefined;
  // Fall back to a simple UTC conversion or system timezone if needed,
  // but for forms, we typically accept the local wall time string and store it as ISO.
  // We can treat it as local string appending the zero offsets if needed, 
  // or simply parse it as an ISO string in the user's current environment.
  // Standard formatISO(new Date(localString)) handles it relative to browser timezone.
  try {
    const d = new Date(localString);
    if (!isValid(d)) return undefined;
    return formatISO(d);
  } catch {
    return undefined;
  }
};
