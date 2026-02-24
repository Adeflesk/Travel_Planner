import { useState } from 'react';

export type WizardStep = 'template' | 'segments' | 'review';

interface UseSegmentWizardReturn {
  step: WizardStep;
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
    currentSegmentIndex,
    goToStep,
    goToSegment,
    nextSegment,
    prevSegment,
    isFirstSegment: currentSegmentIndex === 0,
    isLastSegment: currentSegmentIndex >= segmentCount - 1,
  };
};
