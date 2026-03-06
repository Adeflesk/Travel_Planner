import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { DayList } from './DayList';
import { dayApi } from '@/lib/api';
import type { TripDay } from '@/lib/types';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@/lib/api', () => ({
    dayApi: {
        createDay: vi.fn(),
    },
    accommodationApi: {
        getByTrip: vi.fn().mockResolvedValue({ data: [] }),
    },
}));

// next/link renders a plain <a> tag in test environment
vi.mock('next/link', () => ({
    default: ({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) => (
        <a href={href} className={className}>{children}</a>
    ),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeDay = (overrides: Partial<TripDay> = {}): TripDay => ({
    id: 1,
    trip_id: 10,
    date: '2030-06-01',
    sort_order: 1,
    ...overrides,
});

const defaultProps = {
    days: [] as TripDay[],
    tripId: 10,
    tripStartDate: '2030-06-01',
    onRefresh: vi.fn(),
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DayList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        global.alert = vi.fn();
        (dayApi.createDay as Mock).mockResolvedValue({});
    });

    // ── rendering ─────────────────────────────────────────────────────────

    it('renders the Itinerary heading', () => {
        render(<DayList {...defaultProps} />);
        expect(screen.getByText('Itinerary')).toBeInTheDocument();
    });

    it('shows empty-state message when there are no days', () => {
        render(<DayList {...defaultProps} days={[]} />);
        expect(screen.getByText(/No days planned yet/i)).toBeInTheDocument();
    });

    it('renders day cards when days exist', () => {
        const days = [
            makeDay({ id: 1, date: '2030-06-01', title: 'Day One' }),
            makeDay({ id: 2, date: '2030-06-02', title: 'Day Two' }),
        ];
        render(<DayList {...defaultProps} days={days} />);
        expect(screen.getByText('Day One')).toBeInTheDocument();
        expect(screen.getByText('Day Two')).toBeInTheDocument();
    });

    it('falls back to location when title is absent', () => {
        const days = [makeDay({ id: 1, date: '2030-06-01', title: undefined, location: 'Tokyo' })];
        render(<DayList {...defaultProps} days={days} />);
        expect(screen.getByText('Tokyo')).toBeInTheDocument();
    });

    it('falls back to "Untitled Day" when both title and location are absent', () => {
        const days = [makeDay({ id: 1, date: '2030-06-01', title: undefined, location: undefined })];
        render(<DayList {...defaultProps} days={days} />);
        expect(screen.getByText('Untitled Day')).toBeInTheDocument();
    });

    // ── modal open/close ────────────────────────────────────────────────────

    it('opens the Add Day modal when the button is clicked', () => {
        render(<DayList {...defaultProps} />);
        expect(screen.queryByRole('heading', { name: /^Add Day$/i })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));
        expect(screen.getByRole('heading', { name: /^Add Day$/i })).toBeInTheDocument();
    });

    it('closes the modal when the X button is clicked', () => {
        render(<DayList {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));
        // Close via the × button (aria-label not set, so find the SVG wrapper)
        const closeBtn = screen.getByRole('button', { name: '' }); // the X icon button
        fireEvent.click(closeBtn);
        expect(screen.queryByRole('heading', { name: /^Add Day$/i })).toBeNull();
    });

    // ── defaultNextDate memo ────────────────────────────────────────────────

    it('pre-fills date with tripStartDate when there are no days', () => {
        render(<DayList {...defaultProps} days={[]} tripStartDate="2030-08-15" />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));
        // The date input should be pre-filled with the trip start date
        const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
        expect(dateInput.value).toBe('2030-08-15');
    });

    it('pre-fills date as the day after the last existing day', () => {
        const days = [
            makeDay({ id: 1, date: '2030-06-01' }),
            makeDay({ id: 2, date: '2030-06-05' }), // latest
        ];
        render(<DayList {...defaultProps} days={days} tripStartDate="2030-06-01" />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));
        const dateInput = screen.getByLabelText(/date/i) as HTMLInputElement;
        expect(dateInput.value).toBe('2030-06-06'); // day after 06-05
    });

    // ── handleCreateDay ─────────────────────────────────────────────────────

    it('calls dayApi.createDay with correct payload and refreshes on success', async () => {
        render(<DayList {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));

        fireEvent.change(screen.getByLabelText(/date/i), { target: { value: '2030-07-01' } });
        fireEvent.change(screen.getByPlaceholderText(/e.g. Arrival in Tokyo/i), { target: { value: 'Paris Day' } });
        fireEvent.change(screen.getByPlaceholderText(/e.g. Tokyo, Japan/i), { target: { value: 'Paris' } });

        fireEvent.click(screen.getByRole('button', { name: /^Add Day$/i }));

        await waitFor(() => {
            expect(dayApi.createDay).toHaveBeenCalledWith(
                expect.objectContaining({
                    trip_id: 10,
                    date: '2030-07-01',
                    title: 'Paris Day',
                    location: 'Paris',
                })
            );
        });
        expect(defaultProps.onRefresh).toHaveBeenCalled();
        // Modal should be closed after success
        expect(screen.queryByRole('heading', { name: /^Add Day$/i })).toBeNull();
    });

    it('shows an alert and keeps modal open when createDay fails', async () => {
        (dayApi.createDay as Mock).mockRejectedValueOnce(new Error('Conflict'));
        render(<DayList {...defaultProps} />);
        fireEvent.click(screen.getByRole('button', { name: /\+ Add Day/i }));

        fireEvent.click(screen.getByRole('button', { name: /^Add Day$/i }));

        await waitFor(() => {
            expect(global.alert).toHaveBeenCalled();
        });
        // Modal should still be open
        expect(screen.getByRole('heading', { name: /^Add Day$/i })).toBeInTheDocument();
    });
});
