'use client';

import { WeatherForecast, WeatherDay, TemperatureUnit } from '@/lib/types';
import { Sun, Cloud, CloudRain, CloudSnow, CloudDrizzle } from 'lucide-react';
import { TemperatureToggle } from './TemperatureToggle';

interface WeatherBadgeProps {
  forecast: WeatherForecast;
  temperatureUnit: TemperatureUnit;
  onToggleUnit: () => void;
}

export function WeatherBadge({ forecast, temperatureUnit, onToggleUnit }: WeatherBadgeProps) {
  // Use current weather or first forecast day
  const weatherDay: WeatherDay | undefined = forecast.current || forecast.forecast[0];

  if (!weatherDay) {
    return null;
  }

  // Get appropriate icon based on condition
  const getWeatherIcon = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain')) {
      return <CloudRain className="w-4 h-4" />;
    }
    if (lowerCondition.includes('drizzle')) {
      return <CloudDrizzle className="w-4 h-4" />;
    }
    if (lowerCondition.includes('snow')) {
      return <CloudSnow className="w-4 h-4" />;
    }
    if (lowerCondition.includes('cloud')) {
      return <Cloud className="w-4 h-4" />;
    }
    return <Sun className="w-4 h-4" />;
  };

  // Get background color based on condition
  const getBackgroundStyle = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return 'bg-blue-50 border-blue-200';
    }
    if (lowerCondition.includes('snow')) {
      return 'bg-cyan-50 border-cyan-200';
    }
    if (lowerCondition.includes('cloud')) {
      return 'bg-slate-50 border-slate-200';
    }
    // Clear/sunny
    return 'bg-amber-50 border-amber-200';
  };

  // Get text color based on condition
  const getTextStyle = (condition: string) => {
    const lowerCondition = condition.toLowerCase();
    if (lowerCondition.includes('rain') || lowerCondition.includes('drizzle')) {
      return 'text-blue-700';
    }
    if (lowerCondition.includes('snow')) {
      return 'text-cyan-700';
    }
    if (lowerCondition.includes('cloud')) {
      return 'text-slate-700';
    }
    return 'text-amber-700';
  };

  // Format temperature based on unit
  const getTempString = (weatherDay: WeatherDay) => {
    if (temperatureUnit === 'C') {
      return `${Math.round(weatherDay.temp_high_c)}°C / ${Math.round(weatherDay.temp_low_c)}°C`;
    }
    return `${Math.round(weatherDay.temp_high_f)}°F / ${Math.round(weatherDay.temp_low_f)}°F`;
  };

  const bgStyle = getBackgroundStyle(weatherDay.condition);
  const textStyle = getTextStyle(weatherDay.condition);

  return (
    <div className={`mt-2 ml-7 p-2 ${bgStyle} rounded-md border relative`}>
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 ${textStyle}`}>
          {getWeatherIcon(weatherDay.condition)}
        </div>
        <div className={`flex-1 text-xs ${textStyle}`}>
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{getTempString(weatherDay)}</span>
              <span className="mx-1">•</span>
              <span className="capitalize">{weatherDay.description}</span>
            </div>
            <TemperatureToggle
              unit={temperatureUnit}
              onToggle={onToggleUnit}
            />
          </div>
          {weatherDay.precipitation_chance > 50 && (
            <div className="mt-1">
              <span>☔ {weatherDay.precipitation_chance}% chance of precipitation</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
