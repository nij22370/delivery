"use client";

import { useState, useCallback } from "react";
import type { ResolveJobInput } from "@/types/admin/adminDisputes";

interface ResolveDisputeModalProps {
  isOpen: boolean;
  isPending: boolean;
  jobCode: string;
  onClose: () => void;
  onConfirm: (data: ResolveJobInput) => void;
  initialResolvedStatus?: ResolveJobInput["resolvedStatus"];
  initialPayoutStatus?: ResolveJobInput["payoutStatus"];
}

export default function ResolveDisputeModal({
  isOpen,
  isPending,
  jobCode,
  onClose,
  onConfirm,
  initialResolvedStatus = "posted",
  initialPayoutStatus = "paid",
}: ResolveDisputeModalProps) {
  const [resolvedStatus, setResolvedStatus] = useState<ResolveJobInput["resolvedStatus"]>(initialResolvedStatus);
  const [note, setNote] = useState("");
  const [payoutStatus, setPayoutStatus] = useState<ResolveJobInput["payoutStatus"]>(initialPayoutStatus);

  const handleConfirm = useCallback(() => {
    if (!note.trim()) return;
    onConfirm({
      resolvedStatus,
      note: note.trim(),
      payoutStatus,
    });
  }, [note, resolvedStatus, payoutStatus, onConfirm]);

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

        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
              Resolution
            </label>
            <select
              value={resolvedStatus}
              onChange={(e) => setResolvedStatus(e.target.value as ResolveJobInput["resolvedStatus"])}
              className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer"
            >
              <option value="posted">Reopen Job (Posted)</option>
              <option value="cancelled">Cancel Job</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
              Admin Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explain the resolution..."
              rows={3}
              className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest p-3 text-sm focus:outline-none focus:border-2 focus:border-primary resize-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-secondary uppercase tracking-wider mb-1.5 block">
              Payout Status
            </label>
            <select
              value={payoutStatus}
              onChange={(e) => setPayoutStatus(e.target.value as ResolveJobInput["payoutStatus"])}
              className="w-full h-10 px-3 rounded-lg border border-outline-variant bg-surface-container-lowest text-sm font-medium text-on-surface focus:outline-none focus:border-2 focus:border-primary cursor-pointer"
            >
              <option value="paid">Mark Payout Paid</option>
              <option value="failed">Mark Payout Failed</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={handleClose}
            className="h-10 px-4 rounded-lg border border-outline-variant text-sm font-semibold text-on-surface hover:bg-surface-container-low transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!note.trim() || isPending}
            className="h-10 px-4 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-75 disabled:cursor-not-allowed cursor-pointer"
          >
            {isPending ? "Resolving..." : "Resolve Dispute"}
          </button>
        </div>
      </div>
    </div>
  );
}
