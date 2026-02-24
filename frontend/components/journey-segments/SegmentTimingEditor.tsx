import { JourneySegmentDraft } from '@/lib/types';
import Input from '@/components/ui/Input';
import { toDatetimeLocal, fromDatetimeLocal } from '@/lib/datetime-utils';

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
