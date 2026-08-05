"use client";

interface ProgressBarProps {
  currentStep: number;
  totalSteps?: number;
}

export default function ProgressBar({ currentStep, totalSteps = 4 }: ProgressBarProps) {
  const stepLabels: Record<number, string> = {
    1: "Pickup & Dropoff details",
    2: "Vehicle Selection",
    3: "Pricing & Schedule",
    4: "Review & Submit",
  };

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-on-surface-variant">
        Step {currentStep} of {totalSteps}: {stepLabels[currentStep] ?? ""}
      </p>
      <div className="flex items-center w-full gap-2">
        {Array.from({ length: totalSteps }, (_, segmentIndex) => (
          <div
            key={segmentIndex}
            className={[
              "h-2 flex-grow rounded-full transition-all",
              segmentIndex < currentStep ? "bg-primary" : "bg-surface-variant",
            ].join(" ")}
          />
        ))}
      </div>
    </div>
  );
}