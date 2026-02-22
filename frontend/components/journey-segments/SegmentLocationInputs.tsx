import { JourneySegmentDraft } from '@/lib/types';
import Input from '@/components/ui/Input';
import { AirportAutocomplete } from '@/components/ui/AirportAutocomplete';
import { sanitizeTimezone } from '@/lib/timezone-utils';

const FLIGHT_PLACEHOLDERS = new Set(['Airport', 'Destination Airport', 'Hub']);

interface SegmentLocationInputsProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateLocation: (index: number, side: 'origin' | 'destination', name: string, timezone?: string) => void;
}

export const SegmentLocationInputs = ({
  segment,
  index,
  onUpdateLocation,
}: SegmentLocationInputsProps) => {
  const handleAirportChange = (
    side: 'origin' | 'destination',
    airport: { name: string; iata: string; timezone?: string } | null
  ) => {
    if (!airport) {
      onUpdateLocation(index, side, '');
      return;
    }
    // Single atomic call: name + timezone together to avoid React batching race condition
    onUpdateLocation(index, side, `${airport.name} (${airport.iata})`, sanitizeTimezone(airport.timezone));
  };

  const handleLayoverAirportChange = (
    airport: { name: string; iata: string; timezone?: string } | null
  ) => {
    if (!airport) {
      onUpdateLocation(index, 'origin', '');
      return;
    }
    // Single atomic call — updateLocation's LAYOVER logic sets both origin + destination
    onUpdateLocation(index, 'origin', `${airport.name} (${airport.iata})`, sanitizeTimezone(airport.timezone));
  };

  if (segment.segment_type === 'FLIGHT') {
    return (
      <>
        <div>
          <label className="text-sm font-medium text-slate-700">Origin airport</label>
          <AirportAutocomplete
            value={FLIGHT_PLACEHOLDERS.has(segment.origin.name || '') ? '' : (segment.origin.name || '')}
            onChange={(airport) => handleAirportChange('origin', airport)}
            onBlurFreeText={(text) => onUpdateLocation(index, 'origin', text)}
            placeholder="Search airports by name or code"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700">Destination airport</label>
          <AirportAutocomplete
            value={FLIGHT_PLACEHOLDERS.has(segment.destination.name || '') ? '' : (segment.destination.name || '')}
            onChange={(airport) => handleAirportChange('destination', airport)}
            onBlurFreeText={(text) => onUpdateLocation(index, 'destination', text)}
            placeholder="Search airports by name or code"
          />
        </div>
      </>
    );
  }

  if (segment.segment_type === 'LAYOVER') {
    return (
      <>
        <div>
          <label className="text-sm font-medium text-slate-700">Layover airport</label>
          <AirportAutocomplete
            value={segment.origin.name || ''}
            onChange={(airport) => handleLayoverAirportChange(airport)}
            placeholder="Search airports by name or code"
          />
        </div>
        <div className="flex items-center text-sm text-slate-500">
          Same airport for arrival and departure.
        </div>
      </>
    );
  }

  return (
    <>
      <Input
        label="Origin"
        placeholder="Enter origin"
        value={segment.origin.name || ''}
        onChange={(e) => onUpdateLocation(index, 'origin', e.target.value)}
      />
      <Input
        label="Destination"
        placeholder="Enter destination"
        value={segment.destination.name || ''}
        onChange={(e) => onUpdateLocation(index, 'destination', e.target.value)}
      />
    </>
  );
};
