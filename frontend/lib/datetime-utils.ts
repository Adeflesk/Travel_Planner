import { addHours as dfAddHours, parseISO, formatISO } from 'date-fns';

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
