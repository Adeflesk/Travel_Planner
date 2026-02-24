import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getDateTimeConstraints } from './date-constraints';

// ─── Default behaviour (both dates present) ───────────────────────────────────

describe('getDateTimeConstraints — both dates present, default options', () => {
    const start = '2026-06-01';
    const end = '2026-06-14';

    it('sets minDateTime to start date at 00:00', () => {
        const { minDateTime } = getDateTimeConstraints(start, end);
        expect(minDateTime).toBe('2026-06-01T00:00');
    });

    it('sets maxDateTime to end date at 23:59', () => {
        const { maxDateTime } = getDateTimeConstraints(start, end);
        expect(maxDateTime).toBe('2026-06-14T23:59');
    });

    it('defaults defaultDateTime to startDate + 09:00', () => {
        const { defaultDateTime } = getDateTimeConstraints(start, end);
        expect(defaultDateTime).toBe('2026-06-01T09:00');
    });

    it('accepts a custom defaultTime', () => {
        const { defaultDateTime } = getDateTimeConstraints(start, end, { defaultTime: '14:30' });
        expect(defaultDateTime).toBe('2026-06-01T14:30');
    });
});

// ─── allowBeforeStart ─────────────────────────────────────────────────────────

describe('getDateTimeConstraints — allowBeforeStart: true', () => {
    it('minDateTime is undefined', () => {
        const { minDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            allowBeforeStart: true,
        });
        expect(minDateTime).toBeUndefined();
    });

    it('maxDateTime is still set', () => {
        const { maxDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            allowBeforeStart: true,
        });
        expect(maxDateTime).toBe('2026-06-14T23:59');
    });
});

// ─── allowAfterEnd ────────────────────────────────────────────────────────────

describe('getDateTimeConstraints — allowAfterEnd: true', () => {
    it('maxDateTime is undefined', () => {
        const { maxDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            allowAfterEnd: true,
        });
        expect(maxDateTime).toBeUndefined();
    });

    it('minDateTime is still set', () => {
        const { minDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            allowAfterEnd: true,
        });
        expect(minDateTime).toBe('2026-06-01T00:00');
    });
});

// ─── defaultTo variants ───────────────────────────────────────────────────────

describe('getDateTimeConstraints — defaultTo: end', () => {
    it('defaultDateTime uses endDate', () => {
        const { defaultDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            defaultTo: 'end',
        });
        expect(defaultDateTime).toBe('2026-06-14T09:00');
    });
});

describe('getDateTimeConstraints — defaultTo: today', () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('defaultDateTime uses today\'s date', () => {
        const { defaultDateTime } = getDateTimeConstraints('2026-06-01', '2026-06-14', {
            defaultTo: 'today',
        });
        expect(defaultDateTime).toBe('2026-06-05T09:00');
    });
});

// ─── Missing / invalid inputs ─────────────────────────────────────────────────

describe('getDateTimeConstraints — no startDate', () => {
    it('minDateTime is undefined', () => {
        const { minDateTime } = getDateTimeConstraints(undefined, '2026-06-14');
        expect(minDateTime).toBeUndefined();
    });

    it('defaultDateTime falls back to endDate', () => {
        const { defaultDateTime } = getDateTimeConstraints(undefined, '2026-06-14');
        expect(defaultDateTime).toBe('2026-06-14T09:00');
    });
});

describe('getDateTimeConstraints — no endDate', () => {
    it('maxDateTime is undefined', () => {
        const { maxDateTime } = getDateTimeConstraints('2026-06-01', undefined);
        expect(maxDateTime).toBeUndefined();
    });

    it('defaultDateTime still uses startDate', () => {
        const { defaultDateTime } = getDateTimeConstraints('2026-06-01', undefined);
        expect(defaultDateTime).toBe('2026-06-01T09:00');
    });
});

describe('getDateTimeConstraints — both dates undefined', () => {
    it('all three fields are undefined', () => {
        const result = getDateTimeConstraints(undefined, undefined);
        expect(result.minDateTime).toBeUndefined();
        expect(result.maxDateTime).toBeUndefined();
        expect(result.defaultDateTime).toBeUndefined();
    });
});

describe('getDateTimeConstraints — invalid date string', () => {
    it('invalid startDate is treated as absent', () => {
        const { minDateTime, defaultDateTime } = getDateTimeConstraints('not-a-date', '2026-06-14');
        expect(minDateTime).toBeUndefined();
        // Falls back to endDate
        expect(defaultDateTime).toBe('2026-06-14T09:00');
    });

    it('invalid endDate is treated as absent', () => {
        const { maxDateTime } = getDateTimeConstraints('2026-06-01', 'not-a-date');
        expect(maxDateTime).toBeUndefined();
    });
});
