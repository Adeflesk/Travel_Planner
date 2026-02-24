import { describe, it, expect } from 'vitest';
import { parseISO } from 'date-fns';
import {
    addHoursToISO,
    addHours,
    defaultEndTime,
    toDatetimeLocal,
    fromDatetimeLocal,
    DEFAULT_SEGMENT_DURATION_HOURS,
} from './datetime-utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse the output of addHoursToISO (which may include a local offset like +01:00)
 * and return a UTC Date so we can assert on UTC hours independently of the
 * machine timezone where tests run.
 */
function utcHour(isoResult: string): number {
    return parseISO(isoResult).getUTCHours();
}

function utcMinute(isoResult: string): number {
    return parseISO(isoResult).getUTCMinutes();
}

function utcDate(isoResult: string): string {
    const d = parseISO(isoResult);
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

// ─── addHoursToISO ────────────────────────────────────────────────────────────

describe('addHoursToISO', () => {
    it('adds 2 hours to a UTC ISO string — UTC result is 12:00', () => {
        const result = addHoursToISO('2026-06-01T10:00:00Z', 2);
        expect(utcHour(result)).toBe(12);
        expect(utcMinute(result)).toBe(0);
    });

    it('handles hour overflow into next day (23:00 + 2h → next day 01:00 UTC)', () => {
        const result = addHoursToISO('2026-06-01T23:00:00Z', 2);
        expect(utcDate(result)).toBe('2026-06-02');
        expect(utcHour(result)).toBe(1);
    });

    it('handles negative hours (subtraction: 10:00 − 3h → 07:00 UTC)', () => {
        const result = addHoursToISO('2026-06-01T10:00:00Z', -3);
        expect(utcHour(result)).toBe(7);
    });

    it('handles zero hours (no change: 14:30 stays 14:30 UTC)', () => {
        const result = addHoursToISO('2026-06-01T14:30:00Z', 0);
        expect(utcHour(result)).toBe(14);
        expect(utcMinute(result)).toBe(30);
    });

    it('handles fractional hours (09:00 + 0.5h → 09:30 UTC)', () => {
        const result = addHoursToISO('2026-06-01T09:00:00Z', 0.5);
        expect(utcHour(result)).toBe(9);
        expect(utcMinute(result)).toBe(30);
    });

    it('returns a string (not undefined)', () => {
        expect(typeof addHoursToISO('2026-06-01T10:00:00Z', 1)).toBe('string');
    });
});

// ─── addHours (legacy alias) ──────────────────────────────────────────────────

describe('addHours (legacy alias)', () => {
    it('is identical to addHoursToISO', () => {
        const iso = '2026-06-01T10:00:00Z';
        expect(addHours(iso, 2)).toBe(addHoursToISO(iso, 2));
    });
});

// ─── defaultEndTime ───────────────────────────────────────────────────────────

describe('defaultEndTime', () => {
    it(`defaults to ${DEFAULT_SEGMENT_DURATION_HOURS} hours after start (UTC)`, () => {
        const result = defaultEndTime('2026-06-01T09:00:00Z');
        expect(utcHour(result)).toBe(9 + DEFAULT_SEGMENT_DURATION_HOURS);
        expect(utcMinute(result)).toBe(0);
    });

    it('accepts an explicit 4-hour duration', () => {
        const result = defaultEndTime('2026-06-01T09:00:00Z', 4);
        expect(utcHour(result)).toBe(13);
    });

    it('handles 0 duration (same time returned)', () => {
        const result = defaultEndTime('2026-06-01T09:00:00Z', 0);
        expect(utcHour(result)).toBe(9);
        expect(utcMinute(result)).toBe(0);
    });
});

// ─── toDatetimeLocal ──────────────────────────────────────────────────────────

describe('toDatetimeLocal', () => {
    it('converts an ISO date-time-only string to yyyy-MM-ddTHH:mm format', () => {
        // No Z / offset — date-fns parseISO treats it as local wall clock, which
        // is what the form expects. The format is always yyyy-MM-ddTHH:mm.
        expect(toDatetimeLocal('2026-06-01T14:30:00')).toBe('2026-06-01T14:30');
    });

    it('strips seconds and milliseconds', () => {
        expect(toDatetimeLocal('2026-06-01T09:05:45.123Z')).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('returns a string in the expected format for a plain date+time string', () => {
        const result = toDatetimeLocal('2026-06-01T08:00:00');
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('returns empty string for undefined', () => {
        expect(toDatetimeLocal(undefined)).toBe('');
    });

    it('returns empty string for empty string', () => {
        expect(toDatetimeLocal('')).toBe('');
    });

    it('returns empty string for an invalid ISO string', () => {
        expect(toDatetimeLocal('not-a-date')).toBe('');
    });

    it('returns a non-empty string for a date-only string', () => {
        const result = toDatetimeLocal('2026-06-01');
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
    });
});

// ─── fromDatetimeLocal ────────────────────────────────────────────────────────

describe('fromDatetimeLocal', () => {
    it('converts a datetime-local string to an ISO string', () => {
        const result = fromDatetimeLocal('2026-06-01T09:00');
        expect(result).toBeDefined();
        expect(Number.isNaN(new Date(result!).getTime())).toBe(false);
    });

    it('includes the date in the output', () => {
        const result = fromDatetimeLocal('2026-06-01T14:30');
        expect(result).toContain('2026-06-01');
    });

    it('includes the hour and minute in the output', () => {
        const result = fromDatetimeLocal('2026-06-01T14:30');
        expect(result).toMatch(/14:30/);
    });

    it('returns undefined for undefined input', () => {
        expect(fromDatetimeLocal(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string', () => {
        expect(fromDatetimeLocal('')).toBeUndefined();
    });

    it('returns undefined for a non-date string', () => {
        expect(fromDatetimeLocal('not-a-date')).toBeUndefined();
    });
});
