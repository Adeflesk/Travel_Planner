import { useEffect, useReducer, useRef } from 'react';
import { geocodeAddress, type Coordinates } from '@/lib/geocode-utils';

// Module-level cache shared across all hook instances
const cache = new Map<string, Coordinates | null>();

// Rate-limit queue: spaces Nominatim calls 1100ms apart
let lastCallTime = 0;
const pendingRequests = new Map<string, Promise<Coordinates | null>>();

async function rateLimitedGeocode(address: string): Promise<Coordinates | null> {
  if (cache.has(address)) {
    return cache.get(address)!;
  }

  if (pendingRequests.has(address)) {
    return pendingRequests.get(address)!;
  }

  const doRequest = async (): Promise<Coordinates | null> => {
    const now = Date.now();
    const wait = Math.max(0, lastCallTime + 1100 - now);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastCallTime = Date.now();
    const result = await geocodeAddress(address);
    cache.set(address, result);
    pendingRequests.delete(address);
    return result;
  };

  const promise = doRequest();
  pendingRequests.set(address, promise);
  return promise;
}

type State = { result: Coordinates | null; loading: boolean; error: string | null };
type Action =
  | { type: 'loading' }
  | { type: 'success'; coords: Coordinates | null }
  | { type: 'error'; message: string };

function reducer(_state: State, action: Action): State {
  switch (action.type) {
    case 'loading': return { result: null, loading: true, error: null };
    case 'success': return { result: action.coords, loading: false, error: null };
    case 'error': return { result: null, loading: false, error: action.message };
  }
}

const IDLE: State = { result: null, loading: false, error: null };

export function useGeocode(address: string | undefined): State {
  const normalizedAddress = address?.trim() || '';
  const [state, dispatch] = useReducer(reducer, IDLE);
  const abortedRef = useRef(false);

  useEffect(() => {
    if (!normalizedAddress) return;

    // Cache hit — async to satisfy react-hooks/set-state-in-effect
    if (cache.has(normalizedAddress)) {
      Promise.resolve(cache.get(normalizedAddress)!).then((coords) => {
        if (!abortedRef.current) dispatch({ type: 'success', coords });
      });
      return;
    }

    abortedRef.current = false;
    dispatch({ type: 'loading' });

    rateLimitedGeocode(normalizedAddress).then((coords) => {
      if (abortedRef.current) return;
      dispatch({ type: 'success', coords });
    }).catch((err) => {
      if (abortedRef.current) return;
      dispatch({ type: 'error', message: String(err) });
    });

    return () => {
      abortedRef.current = true;
    };
  }, [normalizedAddress]);

  if (!normalizedAddress) return IDLE;
  return state;
}
