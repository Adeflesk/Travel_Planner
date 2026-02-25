import { JourneySegmentDraft } from '@/lib/types';
import Input from '@/components/ui/Input';

const toDatetimeLocal = (value?: string): string => {
  if (!value) return '';
  return value.substring(0, 16);
};

const fromDatetimeLocal = (value: string): string | undefined => {
  if (!value) return undefined;
  return value.length === 16 ? `${value}:00` : value;
};

interface SegmentTimingEditorProps {
  segment: JourneySegmentDraft;
  index: number;
  onUpdateField: (index: number, field: keyof JourneySegmentDraft, value: unknown) => void;
}

export const SegmentTimingEditor = ({ segment, index, onUpdateField }: SegmentTimingEditorProps) => (
  <>
    <Input
      label="Start time"
      type="datetime-local"
      value={toDatetimeLocal(segment.start_datetime)}
      onChange={(e) => onUpdateField(index, 'start_datetime', fromDatetimeLocal(e.target.value))}
    />
    <Input
      label="End time"
      type="datetime-local"
      value={toDatetimeLocal(segment.end_datetime)}
      onChange={(e) => onUpdateField(index, 'end_datetime', fromDatetimeLocal(e.target.value))}
    />
  </>
);
