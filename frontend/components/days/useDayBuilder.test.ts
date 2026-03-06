import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayBuilder } from './useDayBuilder';
import { dayApi } from '@/lib/api';
import { DayActivity, TripDay } from '@/lib/types';

// Mock the API
vi.mock('@/lib/api', () => ({
    dayApi: {
        createActivity: vi.fn(),
        updateActivity: vi.fn(),
        deleteActivity: vi.fn(),
        updateDay: vi.fn(),
        deleteDay: vi.fn(),
    }
}));

describe('useDayBuilder', () => {
    const mockOnRefresh = vi.fn();
    const mockDay: TripDay = {
        id: 123,
        trip_id: 456,
        date: '2024-03-01',
        title: 'Tokyo Day 1',
        location: 'Tokyo',
        sort_order: 1,
        activities: [],
    };

    beforeEach(() => {
        vi.clearAllMocks();
        // Setup default window.confirm and alert mocks if needed
        global.confirm = vi.fn(() => true);
        global.alert = vi.fn();
    });

    it('initializes with default states', () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        expect(result.current.isFormOpen).toBe(false);
        expect(result.current.selectedActivity).toBe(null);
        expect(result.current.isSubmitting).toBe(false);
    });

    it('opens create form correctly', () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        act(() => {
            result.current.openCreateForm();
        });

        expect(result.current.isFormOpen).toBe(true);
        expect(result.current.selectedActivity).toBe(null);
    });

    it('handles successful activity creation', async () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));
        const activityData = { title: 'New Activity', start_time: '10:00' };

        await act(async () => {
            await result.current.handleSaveActivity(activityData);
        });

        expect(dayApi.createActivity).toHaveBeenCalledWith({
            ...activityData,
            day_id: mockDay.id
        });
        expect(mockOnRefresh).toHaveBeenCalled();
        expect(result.current.isFormOpen).toBe(false);
    });

    it('handles activity update correctly', async () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));
        const existingActivity = { id: 1, title: 'Old Title' };
        const updatedData = { ...existingActivity, title: 'New Title' };

        await act(async () => {
            await result.current.handleSaveActivity(updatedData);
        });

        expect(dayApi.updateActivity).toHaveBeenCalledWith(1, updatedData);
        expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('handles activity deletion', async () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteActivity(1);
        });

        expect(dayApi.deleteActivity).toHaveBeenCalledWith(1);
        expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('handles day update', async () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));
        const updateData = { date: '2024-03-02', title: 'New Tokyo', location: 'Tokyo', notes: '' };

        await act(async () => {
            await result.current.handleUpdateDay(updateData);
        });

        expect(dayApi.updateDay).toHaveBeenCalledWith(mockDay.id, updateData);
        expect(mockOnRefresh).toHaveBeenCalled();
        expect(result.current.showEditDayModal).toBe(false);
    });

    it('sets isSubmitting during async operations', async () => {
        // Mock API with a delay
        (dayApi.updateDay as Mock).mockImplementation(() => new Promise(resolve => setTimeout(resolve, 50)));

        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        let promise: Promise<void>;
        act(() => {
            promise = result.current.handleUpdateDay({ date: '1', title: '2', location: '3', notes: '4' });
        });

        expect(result.current.isSubmitting).toBe(true);

        await act(async () => {
            await promise;
        });

        expect(result.current.isSubmitting).toBe(false);
    });

    // ── handleDeleteDay ──────────────────────────────────────────────────────

    it('handleDeleteDay — happy path: calls deleteDay and refreshes', async () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteDay();
        });

        expect(dayApi.deleteDay).toHaveBeenCalledWith(mockDay.id);
        expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('handleDeleteDay — cancels when user dismisses confirm dialog', async () => {
        global.confirm = vi.fn(() => false);
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteDay();
        });

        expect(dayApi.deleteDay).not.toHaveBeenCalled();
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('handleDeleteDay — shows alert on API failure', async () => {
        (dayApi.deleteDay as Mock).mockRejectedValueOnce(new Error('Server error'));
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteDay();
        });

        expect(global.alert).toHaveBeenCalledWith('Failed to delete day');
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    // ── handleDeleteActivity cancel guard ────────────────────────────────────

    it('handleDeleteActivity — cancels when user dismisses confirm dialog', async () => {
        global.confirm = vi.fn(() => false);
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteActivity(999);
        });

        expect(dayApi.deleteActivity).not.toHaveBeenCalled();
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    it('handleDeleteActivity — shows alert on API failure', async () => {
        (dayApi.deleteActivity as Mock).mockRejectedValueOnce(new Error('Network error'));
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleDeleteActivity(1);
        });

        expect(global.alert).toHaveBeenCalledWith('Failed to delete activity');
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    // ── handleSaveActivity error path ────────────────────────────────────────

    it('handleSaveActivity — shows alert on API failure and leaves form open', async () => {
        (dayApi.createActivity as Mock).mockRejectedValueOnce(new Error('Bad request'));
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        // Open the form first so we can verify it stays open on error
        act(() => { result.current.openCreateForm(); });
        expect(result.current.isFormOpen).toBe(true);

        await act(async () => {
            await result.current.handleSaveActivity({ title: 'Failed Activity', start_time: '09:00' });
        });

        expect(global.alert).toHaveBeenCalledWith('Failed to save activity');
        expect(result.current.isFormOpen).toBe(true); // form stays open
        expect(mockOnRefresh).not.toHaveBeenCalled();
    });

    // ── handleUpdateDay error path ────────────────────────────────────────────

    it('handleUpdateDay — shows alert on API failure', async () => {
        (dayApi.updateDay as Mock).mockRejectedValueOnce(new Error('Conflict'));
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));

        await act(async () => {
            await result.current.handleUpdateDay({ date: '2024-03-02', title: 'X', location: 'Y', notes: '' });
        });

        expect(global.alert).toHaveBeenCalledWith('Failed to update day');
        expect(mockOnRefresh).not.toHaveBeenCalled();
        expect(result.current.showEditDayModal).toBe(false); // modal never opened
    });

    // ── openEditForm ──────────────────────────────────────────────────────────

    it('openEditForm — sets selectedActivity and opens form', () => {
        const { result } = renderHook(() => useDayBuilder(mockDay, mockOnRefresh));
        const activity: DayActivity = {
            id: 42,
            day_id: mockDay.id,
            title: 'Museum Visit',
            category: 'museum',
            start_time: '10:00',
            end_time: '12:00',
            booked: false,
            sort_order: 0,
            is_todo: false,
            is_completed: false,
        };

        act(() => { result.current.openEditForm(activity); });

        expect(result.current.isFormOpen).toBe(true);
        expect(result.current.selectedActivity).toEqual(activity);
    });

    // ── destination_id forwarding ─────────────────────────────────────────────

    it('handleSaveActivity (create) — forwards destination_id from the day', async () => {
        const dayWithDest: TripDay = { ...mockDay, destination_id: 77 };
        const { result } = renderHook(() => useDayBuilder(dayWithDest, mockOnRefresh));

        await act(async () => {
            await result.current.handleSaveActivity({ title: 'Linked Activity', start_time: '11:00' });
        });

        expect(dayApi.createActivity).toHaveBeenCalledWith(
            expect.objectContaining({ destination_id: 77 })
        );
    });
});
