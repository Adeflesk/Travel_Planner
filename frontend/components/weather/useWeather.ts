import { useState, useEffect, useCallback } from 'react';
import { weatherApi } from '@/lib/api';
import { WeatherForecast, TemperatureUnit } from '@/lib/types';

const TEMP_UNIT_KEY = 'preferredTemperatureUnit';

export function useWeather(destinationId: number) {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [temperatureUnit, setTemperatureUnit] = useState<TemperatureUnit>('F');

  // Load temperature preference from localStorage
  useEffect(() => {
    const savedUnit = localStorage.getItem(TEMP_UNIT_KEY);
    if (savedUnit === 'F' || savedUnit === 'C') {
      setTemperatureUnit(savedUnit);
    }
  }, []);

  // Fetch weather data
  const fetchWeather = useCallback(async () => {
    try {
      setLoading(true);
      const response = await weatherApi.getByDestinationId(destinationId);
      setWeather(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching weather:', err);
      // Graceful degradation - don't show error to user, just don't display weather
      setWeather(null);
      setError(err instanceof Error ? err.message : 'Failed to load weather');
    } finally {
      setLoading(false);
    }
  }, [destinationId]);

  useEffect(() => {
    fetchWeather();
  }, [fetchWeather]);

  // Toggle temperature unit
  const toggleTemperatureUnit = useCallback(() => {
    const newUnit: TemperatureUnit = temperatureUnit === 'F' ? 'C' : 'F';
    setTemperatureUnit(newUnit);
    localStorage.setItem(TEMP_UNIT_KEY, newUnit);
  }, [temperatureUnit]);

  return {
    weather,
    loading,
    error,
    temperatureUnit,
    toggleTemperatureUnit,
  };
}
