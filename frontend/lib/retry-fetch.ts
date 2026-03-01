// Helper for resilient fetch with exponential backoff
// Used by geocode-utils to retry Nominatim requests in case of transient network failures.

export interface RetryFetchOptions extends RequestInit {
    // Number of retry attempts (default 3)
    retries?: number;
    // Base backoff delay in ms (default 300)
    backoff?: number;
}

/**
 * Perform a fetch with automatic retries.
 *
 * @param url The request URL.
 * @param options Fetch options plus optional `retries` and `backoff`.
 * @returns The resolved Response object.
 */
export async function retryFetch(
    url: string,
    options: RetryFetchOptions = {}
): Promise<Response> {
    const { retries = 3, backoff = 300, ...fetchOpts } = options;
    let attempt = 0;
    let lastError: unknown;

    while (attempt <= retries) {
        try {
            const response = await fetch(url, fetchOpts);
            if (!response.ok && response.status >= 500) {
                // Server error – treat as retryable
                throw new Error(`Server error ${response.status}`);
            }
            return response;
        } catch (err) {
            lastError = err;
            if (attempt === retries) break;
            const delay = backoff * Math.pow(2, attempt); // exponential backoff
            await new Promise((r) => setTimeout(r, delay));
            attempt++;
        }
    }
    // If we get here all attempts failed
    throw lastError;
}
