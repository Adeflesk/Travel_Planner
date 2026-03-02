/**
 * Utility for geocoding addresses to coordinates using Nominatim API.
 */
import { NOMINATIM_USER_AGENT } from '@/lib/config';
import { retryFetch } from '@/lib/retry-fetch';
export interface Coordinates {
    lat: number;
    lng: number;
}

// Nominatim enforces a strict 1 req/s usage policy.
// All geocodeAddress calls are serialised through this promise chain
// with a 1.1s gap between requests.
let _geocodeQueue: Promise<unknown> = Promise.resolve();

export function geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address || !address.trim()) return Promise.resolve(null);

    const request = _geocodeQueue.then(() => _doGeocode(address));
    // Advance the queue tail regardless of success or failure
    _geocodeQueue = request.then(
        () => new Promise(r => setTimeout(r, 1100)),
        () => new Promise(r => setTimeout(r, 1100)),
    );
    return request;
}

async function _doGeocode(address: string): Promise<Coordinates | null> {
    try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.append('q', address);
        url.searchParams.append('format', 'json');
        url.searchParams.append('limit', '1');

        const res = await retryFetch(url.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': NOMINATIM_USER_AGENT,
            },
        });

        if (!res.ok) {
            console.warn(`Geocoding failed for "${address}": HTTP ${res.status}`);
            return null;
        }

        const data = await res.json();
        if (!data || data.length === 0) {
            console.warn(`No geocoding results found for "${address}"`);
            return null;
        }

        const result = data[0];
        return {
            lat: parseFloat(result.lat),
            lng: parseFloat(result.lon),
        };
    } catch (err) {
        console.error(`Error geocoding address "${address}":`, err);
        return null; // Graceful degradation
    }
}
