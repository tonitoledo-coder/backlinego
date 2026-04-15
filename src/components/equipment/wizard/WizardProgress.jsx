import React from 'react';
import { cn } from '@/lib/utils';

const STEP_LABELS = [
  'Información',
  'Fotos y valor',
  'Precio',
  'Publicación',
];

export default function WizardProgress({ currentStep }) {
  return (
    <div className="w-full mb-8">
      <div className="flex items-center justify-between mb-3">
        {STEP_LABELS.map((label, i) => {
          const step = i + 1;
          const done = step < currentStep;
          const active = step === currentStep;
          return (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all",
                done  ? "bg-green-500 text-black"   : "",
                active ? "bg-white text-zinc-900 ring-2 ring-white ring-offset-2 ring-offset-zinc-950" : "",
                !done && !active ? "bg-zinc-800 text-zinc-500" : ""
              )}>
                {done ? '✓' : step}
              </div>
              <span className={cn(
                "text-[10px] font-medium text-center leading-tight",
                active ? "text-white" : done ? "text-green-400" : "text-zinc-600"
              )}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}