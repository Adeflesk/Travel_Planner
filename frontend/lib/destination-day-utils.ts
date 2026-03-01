import { tripApi, dayApi } from '@/lib/api';
import { TripDay, TripDayCreate } from '@/lib/types';
import { addDays } from 'date-fns';

export interface AutoCreateDaysParams {
    tripId: number;
    destinationId: number;
    destinationName: string;
    arrivalDate: string;   // YYYY-MM-DD
    departureDate: string; // YYYY-MM-DD
}

/**
 * Creates one TripDay per date in [arrivalDate, departureDate],
 * each linked to the given destination.
 * Skips days that already exist, but links the destination if unlinked.
 * Returns the updated/created TripDay records.
 */
export async function autoCreateDaysForDestination(
    params: AutoCreateDaysParams
): Promise<TripDay[]> {
    const { tripId, destinationId, destinationName, arrivalDate, departureDate } = params;

    if (!arrivalDate || !departureDate) return [];

    const startDate = new Date(arrivalDate);
    const endDate = new Date(departureDate);
    if (endDate < startDate) return [];

    // 1. Fetch existing days
    const existingDaysRes = await tripApi.getDays(tripId);
    const existingDays = existingDaysRes.data;
    const existingDates = new Set(existingDays.map(d => d.date));

    // Generate date list
    const dateRange: string[] = [];
    let currentDate = startDate;
    while (currentDate <= endDate) {
        dateRange.push(currentDate.toISOString().split('T')[0]);
        currentDate = addDays(currentDate, 1);
    }

    const results: TripDay[] = [];

    for (const date of dateRange) {
        if (existingDates.has(date)) {
            // Day exists — optionally PATCH to link destination if unlinked
            const existing = existingDays.find(d => d.date === date);
            if (existing && !existing.destination_id) {
                try {
                    const res = await dayApi.updateDay(existing.id, { destination_id: destinationId });
                    results.push(res.data);
                } catch (e) {
                    console.error('Failed to link destination to existing day', e);
                    results.push(existing);
                }
            } else if (existing) {
                results.push(existing);
            }
            continue;
        }

        // Create new day
        const dayData: TripDayCreate = {
            trip_id: tripId,
            date,
            destination_id: destinationId,
            location: destinationName,
            title: '',
        };

        try {
            const res = await dayApi.createDay(dayData);
            results.push(res.data);
        } catch (e) {
            console.error('Failed to create day for date ' + date, e);
        }
    }

    return results;
}
