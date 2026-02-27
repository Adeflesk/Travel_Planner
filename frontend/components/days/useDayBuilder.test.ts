import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDayBuilder } from './useDayBuilder';
import { dayApi } from '@/lib/api';
import { TripDay } from '@/lib/types';

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
});
