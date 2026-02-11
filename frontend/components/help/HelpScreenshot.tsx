'use client';

import { Camera } from 'lucide-react';

interface HelpScreenshotProps {
  title: string;
  description: string;
  aspectRatio?: '16/9' | '4/3' | '1/1';
}

export function HelpScreenshot({
  title,
  description,
  aspectRatio = '16/9'
}: HelpScreenshotProps) {
  const aspectRatioClass = {
    '16/9': 'aspect-video',
    '4/3': 'aspect-[4/3]',
    '1/1': 'aspect-square',
  }[aspectRatio];

  return (
    <div className={`border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 ${aspectRatioClass} my-6 flex items-center justify-center`}>
      <div className="text-center text-slate-500 p-8">
        <Camera className="w-12 h-12 mx-auto mb-2" />
        <p className="font-medium">{title}</p>
        <p className="text-sm mt-1">{description}</p>
      </div>
    </div>
  );
}
