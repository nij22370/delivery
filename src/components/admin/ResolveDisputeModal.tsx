"use client";

import { useState, useCallback, useMemo } from "react";
import type { ResolveJobInput } from "@/types/admin/adminDisputes";

interface ResolveDisputeModalProps {
  isOpen: boolean;
  isPending: boolean;
  jobCode: string;
  onClose: () => void;
  onConfirm: (data: ResolveJobInput) => void;
}

type ResolutionChoice = "cancelled" | "posted" | null;
type MoneyChoice = "refund" | "pay" | "split" | null;

const STEP1_OPTIONS: ReadonlyArray<{ value: ResolveJobInput["resolvedStatus"]; label: string }> = [
  { value: "cancelled", label: "Job should be cancelled" },
  { value: "posted", label: "Job should be re-posted so another driver can take it" },
];

const STEP2_OPTIONS: ReadonlyArray<{ value: Exclude<MoneyChoice, null>; label: string }> = [
  { value: "refund", label: "Refund the poster (sender)" },
  { value: "pay", label: "Pay the driver (courier)" },
  { value: "split", label: "Split it between both" },
];

const STEP1_LABEL = "What happened?";
const STEP2_LABEL = "Who gets the money?";
const STEP3_LABEL = "Explain your decision";
const STEP3_HELPER = "This is saved for records";
const CONFIRM_BUTTON_LABEL = "Confirm Resolution";
const CANCEL_BUTTON_LABEL = "Cancel";
const POSTER_AMOUNT_LABEL = "Poster Amount (NPR)";
const DRIVER_AMOUNT_LABEL = "Driver Amount (NPR)";
const SPLIT_NOTE_PREFIX = "Split payout";
const RESOLVING_LABEL = "Resolving...";

function RadioOption({
  value,
  isSelected,
  label,
  onSelect,
}: {
  value: string;
  isSelected: boolean;
  label: string;
  onSelect: (value: string) => void;
}) {
  const handleSelect = useCallback(() => onSelect(value), [onSelect, value]);
  const iconName = isSelected ? "radio_button_checked" : "radio_button_unchecked";

  return (
    <button
      type="button"
      onClick={handleSelect}
      className={[
        "flex items-center gap-3 min-h-[48px] py-2 px-4 rounded-lg border text-sm font-bold text-left transition-all cursor-pointer w-full",
        isSelected
          ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
          : "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low",
      ].join(" ")}
    >
      <span className="material-symbols-outlined text-lg shrink-0">{iconName}</span>
      <span className="leading-tight">{label}</span>
    </button>
  );
}

export default function ResolveDisputeModal({
  isOpen,
  isPending,
  jobCode,
  onClose,
  onConfirm,
}: ResolveDisputeModalProps) {
  const [resolutionChoice, setResolutionChoice] = useState<ResolutionChoice>(null);
  const [moneyChoice, setMoneyChoice] = useState<MoneyChoice>(null);
  const [posterAmount, setPosterAmount] = useState("");
  const [driverAmount, setDriverAmount] = useState("");
  const [note, setNote] = useState("");

  const handleStep1Select = useCallback((value: ResolutionChoice) => {
    setResolutionChoice(value);
  }, []);

  const handleStep2Select = useCallback((value: MoneyChoice) => {
    setMoneyChoice(value);
  }, []);

  const handlePosterAmountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setPosterAmount(event.target.value);
    },
    []
  );

  const handleDriverAmountChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setDriverAmount(event.target.value);
    },
    []
  );

  const handleNoteChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNote(event.target.value);
  }, []);

  const isConfirmDisabled = useMemo(() => {
    if (resolutionChoice === null || moneyChoice === null || !note.trim()) {
      return true;
    }
    if (isPending) return true;
    if (moneyChoice === "split") {
      const isPosterValid =
        posterAmount.trim() !== "" && !Number.isNaN(Number(posterAmount));
      const isDriverValid =
        driverAmount.trim() !== "" && !Number.isNaN(Number(driverAmount));
      return !isPosterValid || !isDriverValid;
    }
    return false;
  }, [resolutionChoice, moneyChoice, posterAmount, driverAmount, note, isPending]);

  const handleConfirm = useCallback(() => {
    if (resolutionChoice === null || moneyChoice === null || !note.trim()) return;

    let payoutStatus: ResolveJobInput["payoutStatus"];
    let finalNote = note.trim();

    if (moneyChoice === "refund") {
      payoutStatus = "failed";
    } else if (moneyChoice === "pay") {
      payoutStatus = "paid";
    } else {
      payoutStatus = "paid";
      finalNote = `${SPLIT_NOTE_PREFIX} — Poster: NPR ${posterAmount}, Driver: NPR ${driverAmount}. ${finalNote}`;
    }

    onConfirm({
      resolvedStatus: resolutionChoice,
      note: finalNote,
      payoutStatus,
    });
  }, [resolutionChoice, moneyChoice, posterAmount, driverAmount, note, onConfirm]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-surface-white border border-outline-variant rounded-xl shadow-lg p-6 w-full max-w-md">
        <h3 className="text-lg font-bold text-on-surface mb-1">
          Resolve Dispute
        </h3>
        <p className="text-sm text-secondary mb-4">
          Job <span className="font-mono font-bold">{jobCode}</span>
        </p>

        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
              {STEP1_LABEL}
            </p>
            <div className="flex flex-col gap-2">
              {STEP1_OPTIONS.map((option) => (
                <RadioOption
                  key={option.value}
                  value={option.value}
                  isSelected={resolutionChoice === option.value}
                  label={option.label}
                  onSelect={handleStep1Select as (value: string) => void}
                />
              ))}
            </div>
          </div>

          {resolutionChoice !== null && (
            <div>
              <p className="text-xs font-bold text-secondary uppercase tracking-wider mb-2">
                {STEP2_LABEL}
              </p>
              <div className="flex flex-col gap-2">
                {STEP2_OPTIONS.map((option) => (
                  <RadioOption
                    key={option.value}
                    value={option.value}
                    isSelected={moneyChoice === option.value}
                    label={option.label}
                    onSelect={handleStep2Select as (value: string) => void}
                  />
                ))}
              </div>

              {moneyChoice === "split" && (
                <div className="flex flex-col gap-3 mt-3">
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
                      {POSTER_AMOUNT_LABEL}
                    </label>
                    <input
                      type="number"
                      value={posterAmount}
                      onChange={handlePosterAmountChange}
                      placeholder="0"
                      className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
                      {DRIVER_AMOUNT_LABEL}
                    </label>
                    <input
                      type="number"
                      value={driverAmount}
                      onChange={handleDriverAmountChange}
                      placeholder="0"
                      className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary transition-colors"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {moneyChoice !== null && (
            <div>
              <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
                {STEP3_LABEL}
              </label>
              <p className="text-[10px] text-secondary mb-2">{STEP3_HELPER}</p>
              <textarea
                value={note}
                onChange={handleNoteChange}
                placeholder="Why are you resolving this way..."
                rows={3}
                className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm focus:outline-none focus:border-2 focus:border-primary resize-none transition-colors"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            disabled={isPending}
            className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors disabled:opacity-50 cursor-pointer"
          >
            {CANCEL_BUTTON_LABEL}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isConfirmDisabled}
            className="h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? RESOLVING_LABEL : CONFIRM_BUTTON_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
