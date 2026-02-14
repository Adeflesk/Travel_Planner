import { FlightLayoverFormData } from '@/lib/types';

export interface DraftLayover extends FlightLayoverFormData {
  id: number;
  order: number;
}
