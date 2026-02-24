import { describe, it, expect } from 'vitest';
import { createSegmentTemplate } from './segment-templates';
import type { JourneySegmentIntent } from './types';

// Helper: extract segment_types from a template result
const types = (intent: JourneySegmentIntent) =>
    createSegmentTemplate(intent).map((s) => s.segment_type);

// Helper: check order field increments from 0
const hasSequentialOrder = (intent: JourneySegmentIntent) => {
    const segs = createSegmentTemplate(intent);
    return segs.every((s, i) => s.order === i);
};

// ─── AIR_TRAVEL ───────────────────────────────────────────────────────────────

describe('createSegmentTemplate — AIR_TRAVEL', () => {
    it('returns exactly 3 segments', () => {
        expect(createSegmentTemplate('AIR_TRAVEL')).toHaveLength(3);
    });

    it('segment types are [TRANSFER, FLIGHT, TRANSFER]', () => {
        expect(types('AIR_TRAVEL')).toEqual(['TRANSFER', 'FLIGHT', 'TRANSFER']);
    });

    it('every segment has an origin and destination', () => {
        createSegmentTemplate('AIR_TRAVEL').forEach((s) => {
            expect(s.origin).toBeDefined();
            expect(s.destination).toBeDefined();
        });
    });

    it('segments have sequential order values', () => {
        expect(hasSequentialOrder('AIR_TRAVEL')).toBe(true);
    });

    it('uses a provided timezone', () => {
        const segs = createSegmentTemplate('AIR_TRAVEL', { timezone: 'America/New_York' });
        segs.forEach((s) => {
            expect(s.origin_timezone).toBe('America/New_York');
            expect(s.destination_timezone).toBe('America/New_York');
        });
    });

    it('sets start_datetime and end_datetime when startDate is provided', () => {
        const date = new Date('2026-06-01T09:00:00Z');
        const segs = createSegmentTemplate('AIR_TRAVEL', { startDate: date });
        segs.forEach((s) => {
            expect(s.start_datetime).toBeDefined();
            expect(s.end_datetime).toBeDefined();
        });
    });

    it('end_datetime is 2 hours after start_datetime', () => {
        const date = new Date('2026-06-01T09:00:00.000Z');
        const segs = createSegmentTemplate('AIR_TRAVEL', { startDate: date });
        const first = segs[0];
        const startMs = new Date(first.start_datetime!).getTime();
        const endMs = new Date(first.end_datetime!).getTime();
        expect(endMs - startMs).toBe(2 * 60 * 60 * 1000);
    });
});

// ─── AIR_LAYOVER ──────────────────────────────────────────────────────────────

describe('createSegmentTemplate — AIR_LAYOVER', () => {
    it('returns exactly 5 segments', () => {
        expect(createSegmentTemplate('AIR_LAYOVER')).toHaveLength(5);
    });

    it('segment types are [TRANSFER, FLIGHT, LAYOVER, FLIGHT, TRANSFER]', () => {
        expect(types('AIR_LAYOVER')).toEqual([
            'TRANSFER', 'FLIGHT', 'LAYOVER', 'FLIGHT', 'TRANSFER',
        ]);
    });

    it('segments have sequential order values', () => {
        expect(hasSequentialOrder('AIR_LAYOVER')).toBe(true);
    });
});

// ─── ROAD_TRIP ────────────────────────────────────────────────────────────────

describe('createSegmentTemplate — ROAD_TRIP', () => {
    it('returns exactly 5 segments', () => {
        expect(createSegmentTemplate('ROAD_TRIP')).toHaveLength(5);
    });

    it('segment types alternate LEG → STOP → LEG → STOP → LEG', () => {
        expect(types('ROAD_TRIP')).toEqual(['LEG', 'STOP', 'LEG', 'STOP', 'LEG']);
    });

    it('every LEG segment contains at least one draft_segment_option', () => {
        const segs = createSegmentTemplate('ROAD_TRIP');
        const legs = segs.filter((s) => s.segment_type === 'LEG');
        legs.forEach((leg) => {
            const opts = (leg.metadata as Record<string, unknown>)?.draft_segment_options;
            expect(Array.isArray(opts)).toBe(true);
            expect((opts as unknown[]).length).toBeGreaterThanOrEqual(1);
        });
    });

    it('every STOP segment contains at least one draft_stop_option', () => {
        const segs = createSegmentTemplate('ROAD_TRIP');
        const stops = segs.filter((s) => s.segment_type === 'STOP');
        stops.forEach((stop) => {
            const opts = (stop.metadata as Record<string, unknown>)?.draft_stop_options;
            expect(Array.isArray(opts)).toBe(true);
            expect((opts as unknown[]).length).toBeGreaterThanOrEqual(1);
        });
    });

    it('all stop options have valid option_types', () => {
        const validTypes = ['activity', 'meal', 'sightseeing', 'rest', 'fuel', 'shopping', 'other'];
        const segs = createSegmentTemplate('ROAD_TRIP');
        const stops = segs.filter((s) => s.segment_type === 'STOP');
        stops.forEach((stop) => {
            const opts = (stop.metadata as Record<string, unknown>)?.draft_stop_options as Array<{ option_type: string }>;
            opts.forEach((opt) => {
                expect(validTypes).toContain(opt.option_type);
            });
        });
    });

    it('segments have sequential order values', () => {
        expect(hasSequentialOrder('ROAD_TRIP')).toBe(true);
    });
});

// ─── ROAD_TRIP_WITH_STOPS ──────────────────────────────────────────────────────

describe('createSegmentTemplate — ROAD_TRIP_WITH_STOPS', () => {
    it('returns exactly 7 segments', () => {
        expect(createSegmentTemplate('ROAD_TRIP_WITH_STOPS')).toHaveLength(7);
    });

    it('starts with LEG and ends with LEG', () => {
        const segs = createSegmentTemplate('ROAD_TRIP_WITH_STOPS');
        expect(segs[0].segment_type).toBe('LEG');
        expect(segs[segs.length - 1].segment_type).toBe('LEG');
    });

    it('has 4 LEG segments', () => {
        const segs = createSegmentTemplate('ROAD_TRIP_WITH_STOPS');
        expect(segs.filter((s) => s.segment_type === 'LEG')).toHaveLength(4);
    });

    it('has 3 STOP segments', () => {
        const segs = createSegmentTemplate('ROAD_TRIP_WITH_STOPS');
        expect(segs.filter((s) => s.segment_type === 'STOP')).toHaveLength(3);
    });

    it('segments have sequential order values', () => {
        expect(hasSequentialOrder('ROAD_TRIP_WITH_STOPS')).toBe(true);
    });
});

// ─── MULTI_STOP ───────────────────────────────────────────────────────────────

describe('createSegmentTemplate — MULTI_STOP', () => {
    it('returns exactly 3 segments', () => {
        expect(createSegmentTemplate('MULTI_STOP')).toHaveLength(3);
    });

    it('segment types are [TRANSFER, STOP, TRANSFER]', () => {
        expect(types('MULTI_STOP')).toEqual(['TRANSFER', 'STOP', 'TRANSFER']);
    });

    it('segments have sequential order values', () => {
        expect(hasSequentialOrder('MULTI_STOP')).toBe(true);
    });
});

// ─── SIMPLE (default) ─────────────────────────────────────────────────────────

describe('createSegmentTemplate — SIMPLE', () => {
    it('returns exactly 1 segment', () => {
        expect(createSegmentTemplate('SIMPLE')).toHaveLength(1);
    });

    it('segment type is TRANSFER', () => {
        expect(types('SIMPLE')).toEqual(['TRANSFER']);
    });

    it('segment has order 0', () => {
        expect(createSegmentTemplate('SIMPLE')[0].order).toBe(0);
    });
});

// ─── No options (undefined startDate) ────────────────────────────────────────

describe('createSegmentTemplate — no options', () => {
    it('all segments have undefined start_datetime when no startDate given', () => {
        const segs = createSegmentTemplate('AIR_TRAVEL');
        segs.forEach((s) => {
            expect(s.start_datetime).toBeUndefined();
            expect(s.end_datetime).toBeUndefined();
        });
    });
});
