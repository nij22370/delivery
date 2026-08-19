"use client";

import { useState, useCallback } from "react";
import type { AdminJobItem, AllowedOverrideStatus } from "@/types/admin/adminJobs";
import { JOB_STATUS } from "@/types/job";

interface StatusOverrideModalProps {
  job: AdminJobItem;
  isOpen: boolean;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (jobId: string, status: AllowedOverrideStatus, reason?: string) => void;
}

export default function StatusOverrideModal({
  job,
  isOpen,
  isPending,
  onClose,
  onConfirm,
}: StatusOverrideModalProps) {
  const [selectedStatus, setSelectedStatus] = useState<AllowedOverrideStatus>(
    job.status === JOB_STATUS.DISPUTED ? "posted" : "cancelled"
  );
  const [reason, setReason] = useState("");

  const handleConfirm = useCallback(() => {
    onConfirm(job._id, selectedStatus, reason.trim() || undefined);
  }, [job._id, selectedStatus, reason, onConfirm]);

  const handleReasonChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setReason(e.target.value);
    },
    []
  );

  const handleSelectStatus = useCallback((status: AllowedOverrideStatus) => {
    setSelectedStatus(status);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-surface-white rounded-xl shadow-xl border border-outline-variant p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-outline-variant pb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-warning-amber text-2xl">
              published_with_changes
            </span>
            <h3 className="text-lg font-bold text-on-surface">Override Job Status</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-secondary hover:bg-surface-container cursor-pointer"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="bg-surface-container-low rounded-lg p-4 flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-secondary font-medium">Job Code:</span>
            <span className="font-bold text-primary">{job.jobCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary font-medium">Current Status:</span>
            <span className="font-semibold uppercase tracking-wider text-xs px-2 py-0.5 rounded bg-surface-white border border-outline-variant">
              {job.status}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-secondary font-medium">Poster:</span>
            <span className="font-medium text-on-surface">{job.poster.name}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider">
            Select New Status
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleSelectStatus("cancelled")}
              className={[
                "flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-semibold transition-all cursor-pointer",
                selectedStatus === "cancelled"
                  ? "border-error-red bg-error-container/20 text-error-red ring-2 ring-error-red/20"
                  : "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low",
              ].join(" ")}
            >
              <span className="material-symbols-outlined text-lg">cancel</span>
              Cancel Job
            </button>

            {job.status === "disputed" && (
              <button
                type="button"
                onClick={() => handleSelectStatus("posted")}
                className={[
                  "flex items-center justify-center gap-2 h-12 rounded-lg border text-sm font-semibold transition-all cursor-pointer",
                  selectedStatus === "posted"
                    ? "border-primary bg-primary/10 text-primary ring-2 ring-primary/20"
                    : "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low",
                ].join(" ")}
              >
                <span className="material-symbols-outlined text-lg">restart_alt</span>
                Reset to Open (Posted)
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-secondary uppercase tracking-wider">
            Reason / Audit Notes (Optional)
          </label>
          <textarea
            value={reason}
            onChange={handleReasonChange}
            placeholder="Document rationale for admin status override..."
            rows={3}
            className="w-full rounded-lg border border-outline-variant bg-surface-white p-3 text-sm focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 resize-none"
          />
        </div>

        <div className="p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-lg flex items-start gap-2 text-xs text-warning-amber">
          <span className="material-symbols-outlined text-base shrink-0 mt-0.5">info</span>
          <p>
            Terminal status (Delivered) is immutable. Status overrides trigger Pusher alerts to
            participants and are permanently logged.
          </p>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 h-12 rounded-lg border border-outline-variant text-sm font-semibold text-secondary hover:bg-surface-container transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="px-5 h-12 rounded-lg bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-sm"
          >
            {isPending && (
              <span className="material-symbols-outlined text-base animate-spin">
                progress_activity
              </span>
            )}
            Confirm Override
          </button>
        </div>
      </div>
    </div>
  );
}
