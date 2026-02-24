import { useState } from 'react';
import type { JourneySegmentIntent } from '@/lib/types';

export type WizardStep = 'template' | 'segments' | 'review';

export const ROAD_TRIP_INTENTS: JourneySegmentIntent[] = ['ROAD_TRIP', 'ROAD_TRIP_WITH_STOPS'];

interface UseSegmentWizardReturn {
  step: WizardStep;
  intent: JourneySegmentIntent | null;
  setIntent: (intent: JourneySegmentIntent | null) => void;
  isRoadTrip: boolean;
  currentSegmentIndex: number;
  goToStep: (step: WizardStep) => void;
  goToSegment: (index: number) => void;
  nextSegment: () => void;
  prevSegment: () => void;
  isFirstSegment: boolean;
  isLastSegment: boolean;
}

export const useSegmentWizard = (segmentCount: number): UseSegmentWizardReturn => {
  const [step, setStep] = useState<WizardStep>('template');
  const [intent, setIntent] = useState<JourneySegmentIntent | null>(null);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);

  const goToStep = (newStep: WizardStep) => {
    setStep(newStep);
    if (newStep === 'segments') setCurrentSegmentIndex(0);
  };

  const goToSegment = (index: number) => {
    setCurrentSegmentIndex(index);
    setStep('segments');
  };

  const nextSegment = () => {
    if (currentSegmentIndex < segmentCount - 1) {
      setCurrentSegmentIndex((i) => i + 1);
    } else {
      setStep('review');
    }
  };

  const prevSegment = () => {
    if (currentSegmentIndex > 0) {
      setCurrentSegmentIndex((i) => i - 1);
    } else {
      setStep('template');
    }
  };

  return {
    step,
    intent,
    setIntent,
    isRoadTrip: intent !== null && ROAD_TRIP_INTENTS.includes(intent),
    currentSegmentIndex,
    goToStep,
    goToSegment,
    nextSegment,
    prevSegment,
    isFirstSegment: currentSegmentIndex === 0,
    isLastSegment: currentSegmentIndex >= segmentCount - 1,
  };
};
