"use client";

import { useCallback } from "react";
import type { JobVehicleType } from "@/types/job";

interface VehicleOption {
  value: JobVehicleType;
  label: string;
  icon: string;
  description: string;
  maxWeight: string;
}

interface VehicleCardProps {
  option: VehicleOption;
  isSelected: boolean;
  onSelect: (value: JobVehicleType) => void;
}

export default function VehicleCard({
  option,
  isSelected,
  onSelect,
}: VehicleCardProps) {
  const handleClick = useCallback(() => {
    onSelect(option.value);
  }, [option.value, onSelect]);

  return (
    <div
      className={[
        "border rounded-xl p-6 cursor-pointer flex flex-col h-full transition-all duration-200 bg-surface-white",
        isSelected
          ? "border-primary bg-[#dae2ff]/20 shadow-sm"
          : "border-outline-variant hover:-translate-y-0.5 hover:shadow-sm",
      ].join(" ")}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div
          className={[
            "w-12 h-12 rounded-full flex items-center justify-center transition-colors",
            isSelected
              ? "bg-primary-fixed text-primary"
              : "bg-surface-container text-on-surface-variant",
          ].join(" ")}
        >
          <span
            className="material-symbols-outlined text-2xl"
            style={{ fontVariationSettings: isSelected ? "'FILL' 1" : "'FILL' 0" }}
          >
            {option.icon}
          </span>
        </div>
        <div
          className={[
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
            isSelected ? "border-primary" : "border-outline-variant",
          ].join(" ")}
        >
          {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
        </div>
      </div>
      <h3 className="text-base font-semibold text-on-surface mb-1">{option.label}</h3>
      <p className="text-sm text-on-surface-variant mb-4 flex-grow leading-relaxed">
        {option.description}
      </p>
      <div className="flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-lg w-fit">
        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>
          weight
        </span>
        <span>{option.maxWeight}</span>
      </div>
    </div>
  );
}