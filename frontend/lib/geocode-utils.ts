/**
 * Utility for geocoding addresses to coordinates using Nominatim API.
 */

export interface Coordinates {
    lat: number;
    lng: number;
}

/**
 * Geocodes an address string to latitude and longitude using Nominatim.
 * Nominatim requires a User-Agent, so we provide one identifying the app.
 *
 * @param address The address string to geocode (e.g. "Paris, France" or "JFK Airport")
 * @returns {lat, lng} or null if geocoding fails or no results found
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
    if (!address || !address.trim()) return null;

    try {
        const url = new URL('https://nominatim.openstreetmap.org/search');
        url.searchParams.append('q', address);
        url.searchParams.append('format', 'json');
        url.searchParams.append('limit', '1');

        const res = await fetch(url.toString(), {
            method: 'GET',
            headers: {
                'User-Agent': 'TravelPlannerApp/1.0 (Integration/Nominatim)',
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
