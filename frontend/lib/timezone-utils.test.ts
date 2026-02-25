import { describe, it, expect } from 'vitest';
import {
    isValidTimezone,
    sanitizeTimezone,
    ensureUTC,
    formatDuration,
    formatDurationLong,
    calculateFlightDuration,
    getTimezoneOffsetDifference,
    formatTimezoneDifference,
    parseIATACode,
    crossesMidnight,
    getLocalTimezone,
} from './timezone-utils';

// ─── isValidTimezone ──────────────────────────────────────────────────────────

describe('isValidTimezone', () => {
    it('returns true for a valid IANA timezone', () => {
        expect(isValidTimezone('America/New_York')).toBe(true);
    });

    it('returns true for UTC', () => {
        expect(isValidTimezone('UTC')).toBe(true);
    });

    it('returns true for Europe/Dublin', () => {
        expect(isValidTimezone('Europe/Dublin')).toBe(true);
    });

    it('returns true for Asia/Kolkata (half-hour offset)', () => {
        expect(isValidTimezone('Asia/Kolkata')).toBe(true);
    });

    it('returns false for a country code "USA"', () => {
        expect(isValidTimezone('USA')).toBe(false);
    });

    it('returns false for an empty string', () => {
        expect(isValidTimezone('')).toBe(false);
    });

    it('returns false for a whitespace-only string', () => {
        expect(isValidTimezone('   ')).toBe(false);
    });

    it('returns false for null', () => {
        expect(isValidTimezone(null)).toBe(false);
    });

    it('returns false for undefined', () => {
        expect(isValidTimezone(undefined)).toBe(false);
    });

    it('returns false for a numeric value', () => {
        expect(isValidTimezone(5)).toBe(false);
    });

    it('returns false for a gibberish string', () => {
        expect(isValidTimezone('Foo/Bar')).toBe(false);
    });
});

// ─── sanitizeTimezone ─────────────────────────────────────────────────────────

describe('sanitizeTimezone', () => {
    it('passes through a valid timezone', () => {
        expect(sanitizeTimezone('America/Los_Angeles')).toBe('America/Los_Angeles');
    });

    it('returns undefined for an invalid timezone', () => {
        expect(sanitizeTimezone('INVALID')).toBeUndefined();
    });

    it('returns undefined for null', () => {
        expect(sanitizeTimezone(null)).toBeUndefined();
    });
});

// ─── ensureUTC ────────────────────────────────────────────────────────────────

describe('ensureUTC', () => {
    it('appends Z to a bare datetime string (no offset)', () => {
        expect(ensureUTC('2026-06-01T10:00:00')).toBe('2026-06-01T10:00:00Z');
    });

    it('does not modify a string already ending in Z', () => {
        expect(ensureUTC('2026-06-01T10:00:00Z')).toBe('2026-06-01T10:00:00Z');
    });

    it('does not modify a string with a positive offset', () => {
        const s = '2026-06-01T10:00:00+05:30';
        expect(ensureUTC(s)).toBe(s);
    });

    it('does not modify a string with a negative offset', () => {
        const s = '2026-06-01T10:00:00-08:00';
        expect(ensureUTC(s)).toBe(s);
    });

    it('passes through an empty string unchanged', () => {
        expect(ensureUTC('')).toBe('');
    });
});

// ─── formatDuration ───────────────────────────────────────────────────────────

describe('formatDuration', () => {
    it('formats 0 minutes as "0m"', () => {
        expect(formatDuration(0)).toBe('0m');
    });

    it('formats negative minutes as "0m"', () => {
        expect(formatDuration(-10)).toBe('0m');
    });

    it('formats 45 minutes as "45m"', () => {
        expect(formatDuration(45)).toBe('45m');
    });

    it('formats exactly 60 minutes as "1h"', () => {
        expect(formatDuration(60)).toBe('1h');
    });

    it('formats 90 minutes as "1h 30m"', () => {
        expect(formatDuration(90)).toBe('1h 30m');
    });

    it('formats 125 minutes as "2h 5m"', () => {
        expect(formatDuration(125)).toBe('2h 5m');
    });

    it('formats exactly 120 minutes as "2h"', () => {
        expect(formatDuration(120)).toBe('2h');
    });

    it('formats a long flight (780 min = 13h) as "13h"', () => {
        expect(formatDuration(780)).toBe('13h');
    });
});

// ─── formatDurationLong ───────────────────────────────────────────────────────

describe('formatDurationLong', () => {
    it('formats 0 minutes as "0 minutes"', () => {
        expect(formatDurationLong(0)).toBe('0 minutes');
    });

    it('formats 1 minute using singular "minute"', () => {
        expect(formatDurationLong(1)).toBe('1 minute');
    });

    it('formats 2 minutes using plural "minutes"', () => {
        expect(formatDurationLong(2)).toBe('2 minutes');
    });

    it('formats 60 minutes as "1 hour"', () => {
        expect(formatDurationLong(60)).toBe('1 hour');
    });

    it('formats 120 minutes as "2 hours"', () => {
        expect(formatDurationLong(120)).toBe('2 hours');
    });

    it('formats 90 minutes as "1 hour 30 minutes"', () => {
        expect(formatDurationLong(90)).toBe('1 hour 30 minutes');
    });

    it('formats 61 minutes as "1 hour 1 minute"', () => {
        expect(formatDurationLong(61)).toBe('1 hour 1 minute');
    });

    it('formats negative as "0 minutes"', () => {
        expect(formatDurationLong(-5)).toBe('0 minutes');
    });
});

// ─── calculateFlightDuration ─────────────────────────────────────────────────

describe('calculateFlightDuration', () => {
    it('calculates a simple same-timezone duration', () => {
        // 2 hours = 120 minutes
        expect(
            calculateFlightDuration('2026-06-01T08:00:00', '2026-06-01T10:00:00')
        ).toBe(120);
    });

    it('calculates a cross-timezone flight (NYC departs 08:00 ET, LA lands 11:00 PT)', () => {
        // ET = UTC-5 (winter) / UTC-4 (summer — June)
        // PT = UTC-8 (winter) / UTC-7 (summer — June)
        // Difference: NY is 3h ahead of LA in June
        // Actual flight time: 08:00 ET + 3h offset + flight = 11:00 PT means 6h flight
        const dep = '2026-06-01T08:00:00'; // Wall time at JFK
        const arr = '2026-06-01T11:00:00'; // Wall time at LAX
        const minutes = calculateFlightDuration(
            dep, arr,
            'America/New_York',
            'America/Los_Angeles'
        );
        // With NY being 3h ahead of LA, 11:00 PT = 14:00 ET → 6 hours after 08:00 ET
        expect(minutes).toBe(360);
    });

    it('returns 0 when arrival is before departure (malformed data)', () => {
        expect(
            calculateFlightDuration('2026-06-01T12:00:00', '2026-06-01T10:00:00')
        ).toBe(0);
    });

    it('handles a zero-duration flight (same time)', () => {
        expect(
            calculateFlightDuration('2026-06-01T10:00:00', '2026-06-01T10:00:00')
        ).toBe(0);
    });
});

// ─── getTimezoneOffsetDifference ─────────────────────────────────────────────

describe('getTimezoneOffsetDifference', () => {
    // Use a fixed summer date so DST rules are consistent
    const summerDate = new Date('2026-06-15T12:00:00Z');

    it('LA vs NY is 3 hours in summer', () => {
        const diff = getTimezoneOffsetDifference(
            'America/Los_Angeles',
            'America/New_York',
            summerDate
        );
        expect(diff).toBe(3);
    });

    it('NY vs LA is -3 hours in summer', () => {
        const diff = getTimezoneOffsetDifference(
            'America/New_York',
            'America/Los_Angeles',
            summerDate
        );
        expect(diff).toBe(-3);
    });

    it('same timezone returns 0', () => {
        expect(
            getTimezoneOffsetDifference('UTC', 'UTC', summerDate)
        ).toBe(0);
    });

    it('UTC vs IST (India) is 5.5 hours', () => {
        const diff = getTimezoneOffsetDifference('UTC', 'Asia/Kolkata', summerDate);
        expect(diff).toBe(5.5);
    });
});

// ─── formatTimezoneDifference ─────────────────────────────────────────────────

describe('formatTimezoneDifference', () => {
    const summerDate = new Date('2026-06-15T12:00:00Z');

    it('LA vs NY → "3 hours ahead"', () => {
        expect(
            formatTimezoneDifference('America/Los_Angeles', 'America/New_York', summerDate)
        ).toBe('3 hours ahead');
    });

    it('NY vs LA → "3 hours behind"', () => {
        expect(
            formatTimezoneDifference('America/New_York', 'America/Los_Angeles', summerDate)
        ).toBe('3 hours behind');
    });

    it('same timezone → "Same timezone"', () => {
        expect(
            formatTimezoneDifference('UTC', 'UTC', summerDate)
        ).toBe('Same timezone');
    });

    it('1-hour difference uses singular "hour"', () => {
        const result = formatTimezoneDifference(
            'Europe/London', 'Europe/Paris', summerDate
        );
        expect(result).toMatch(/1 hour (ahead|behind)/);
    });
});

// ─── parseIATACode ────────────────────────────────────────────────────────────

describe('parseIATACode', () => {
    it('parses a plain 3-letter code', () => {
        expect(parseIATACode('LAX')).toBe('LAX');
    });

    it('upcases a lowercase code', () => {
        expect(parseIATACode('lax')).toBe('LAX');
    });

    it('extracts code from "LAX - Los Angeles"', () => {
        expect(parseIATACode('LAX - Los Angeles')).toBe('LAX');
    });

    it('extracts code from "(LAX)"', () => {
        expect(parseIATACode('(LAX)')).toBe('LAX');
    });

    it('returns null for an empty string', () => {
        expect(parseIATACode('')).toBeNull();
    });

    it('returns null for a 2-letter string', () => {
        // "LA" is not a valid IATA code (only 2 chars)
        expect(parseIATACode('LA')).toBeNull();
    });

    it('returns null for a 4-letter string with no embedded 3-letter word', () => {
        // IATA codes are strictly 3 uppercase letters
        expect(parseIATACode('LAXS')).toBeNull();
    });

    it('returns the first 3-letter word for "DUB to JFK"', () => {
        // First match is DUB
        expect(parseIATACode('DUB to JFK')).toBe('DUB');
    });
});

// ─── crossesMidnight ─────────────────────────────────────────────────────────

describe('crossesMidnight', () => {
    it('returns false when both times are on the same day', () => {
        expect(crossesMidnight('2026-06-01T08:00:00', '2026-06-01T18:00:00')).toBe(false);
    });

    it('returns true when departure is evening and arrival is next morning', () => {
        expect(crossesMidnight('2026-06-01T22:00:00', '2026-06-02T06:00:00')).toBe(true);
    });

    it('returns true when arrival is in a different month', () => {
        expect(crossesMidnight('2026-06-30T23:00:00', '2026-07-01T01:00:00')).toBe(true);
    });

    it('returns true when arrival is in a different year', () => {
        expect(crossesMidnight('2026-12-31T23:00:00', '2027-01-01T01:00:00')).toBe(true);
    });
});

// ─── getLocalTimezone ─────────────────────────────────────────────────────────

describe('getLocalTimezone', () => {
    it('returns a non-empty string', () => {
        const tz = getLocalTimezone();
        expect(typeof tz).toBe('string');
        expect(tz.length).toBeGreaterThan(0);
    });

    it('returns a valid IANA timezone', () => {
        // Whatever the local tz is in Node, it should be valid
        expect(isValidTimezone(getLocalTimezone())).toBe(true);
    });
});
