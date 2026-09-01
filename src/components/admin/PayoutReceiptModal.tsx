"use client";

import { useEffect, useCallback } from "react";
import { formatNpr } from "@/utils/format";
import type { AdminPayoutItem } from "@/types/admin/adminPayouts";

const MODAL_OVERLAY_CLASS =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4";
const MODAL_CARD_CLASS =
  "bg-[var(--color-surface-container-lowest)] rounded-2xl shadow-2xl border border-outline-variant " +
  "max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]";
const HEADER_CLASS =
  "flex items-center justify-between px-6 py-4 border-b border-outline-variant";
const SECTION_LABEL_CLASS = "text-[10px] font-bold uppercase tracking-widest text-secondary";
const FIELD_LABEL_CLASS = "text-[11px] font-bold uppercase tracking-widest text-secondary";
const FIELD_VALUE_CLASS = "text-sm text-on-surface font-semibold break-words";
const ROW_CLASS = "flex flex-col gap-1";

const HEADING = "Payout Receipt";
const CLOSE_LABEL = "Close";
const COPY_LABEL = "Copy transaction ID";
const COPY_SUCCESS = "Transaction ID copied";
const RECEIPT_ID_PREFIX = "Receipt ID";
const DRIVER_LABEL = "Driver";
const JOB_LABEL = "Job ID";
const AMOUNT_LABEL = "Amount";
const PLATFORM_FEE_LABEL = "Platform Fee";
const GATEWAY_LABEL = "Gateway";
const TRANSACTION_ID_LABEL = "Transaction ID";
const PAID_AT_LABEL = "Paid At";
const CREATED_AT_LABEL = "Created At";
const NOTES_LABEL = "Notes";
const NO_NOTES_VALUE = "—";

function formatDateTime(value: string | undefined): string {
  if (!value) return NO_NOTES_VALUE;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return NO_NOTES_VALUE;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function getStatusBadgeStyle(status: string): string {
  if (status === "paid") return "bg-success-green/15 text-success-green";
  if (status === "failed") return "bg-error-red/15 text-error-red";
  return "bg-warning-amber/15 text-warning-amber";
}

interface PayoutReceiptModalProps {
  isOpen: boolean;
  payout: AdminPayoutItem | null;
  onClose: () => void;
}

export default function PayoutReceiptModal({
  isOpen,
  payout,
  onClose,
}: PayoutReceiptModalProps) {
  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, handleKey]);

  const handleCopyTransaction = useCallback(async () => {
    if (!payout) return;
    try {
      await navigator.clipboard.writeText(payout.gatewayTransactionId);
      // Use a small inline status indicator instead of a toast to keep this modal self-contained.
      window.alert(COPY_SUCCESS);
    } catch {
      // Silently ignore — clipboard API may be unavailable in some browsers.
    }
  }, [payout]);

  if (!isOpen || !payout) return null;

  return (
    <div
      className={MODAL_OVERLAY_CLASS}
      role="dialog"
      aria-modal="true"
      aria-labelledby="payout-receipt-heading"
      onClick={onClose}
    >
      <div
        className={MODAL_CARD_CLASS}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={HEADER_CLASS}>
          <div>
            <p className={SECTION_LABEL_CLASS}>{RECEIPT_ID_PREFIX}</p>
            <h2 id="payout-receipt-heading" className="text-lg font-bold text-on-surface">
              {HEADING}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full text-secondary hover:bg-surface-container transition-colors cursor-pointer flex items-center justify-center"
            aria-label={CLOSE_LABEL}
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </header>

        <div className="overflow-y-auto px-6 py-5 space-y-5">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface-container">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-secondary">
                {AMOUNT_LABEL}
              </p>
              <p className="text-2xl font-black text-on-surface">
                {formatNpr(payout.amount)}
              </p>
            </div>
            <span
              className={`text-[10px] font-black uppercase rounded-full px-3 py-1 ${getStatusBadgeStyle(payout.status)}`}
            >
              {payout.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{DRIVER_LABEL}</span>
              <span className={FIELD_VALUE_CLASS}>{payout.driverName}</span>
              <span className="text-xs text-secondary break-all">
                {payout.driverEmail}
              </span>
            </div>
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{JOB_LABEL}</span>
              <span className="text-sm text-on-surface font-mono break-all">
                {payout.jobId}
              </span>
            </div>
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{PLATFORM_FEE_LABEL}</span>
              <span className={FIELD_VALUE_CLASS}>
                {formatNpr(payout.platformFee)}
              </span>
            </div>
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{GATEWAY_LABEL}</span>
              <span className={FIELD_VALUE_CLASS}>
                {payout.gateway === "esewa" ? "eSewa" : "Khalti"}
              </span>
            </div>
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{PAID_AT_LABEL}</span>
              <span className={FIELD_VALUE_CLASS}>
                {formatDateTime(payout.paidAt)}
              </span>
            </div>
            <div className={ROW_CLASS}>
              <span className={FIELD_LABEL_CLASS}>{CREATED_AT_LABEL}</span>
              <span className={FIELD_VALUE_CLASS}>
                {formatDateTime(payout.createdAt)}
              </span>
            </div>
          </div>

          <div className={ROW_CLASS}>
            <span className={FIELD_LABEL_CLASS}>{TRANSACTION_ID_LABEL}</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono text-on-surface bg-surface-container px-3 py-2 rounded-lg break-all">
                {payout.gatewayTransactionId}
              </code>
              <button
                type="button"
                onClick={handleCopyTransaction}
                className="shrink-0 w-9 h-9 rounded-lg bg-surface-container text-secondary hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-center"
                aria-label={COPY_LABEL}
                title={COPY_LABEL}
              >
                <span className="material-symbols-outlined text-base">content_copy</span>
              </button>
            </div>
          </div>

          <div className={ROW_CLASS}>
            <span className={FIELD_LABEL_CLASS}>{NOTES_LABEL}</span>
            <p className="text-sm text-on-surface whitespace-pre-wrap">
              {payout.note?.trim() ? payout.note : NO_NOTES_VALUE}
            </p>
          </div>
        </div>

        <footer className="px-6 py-4 border-t border-outline-variant flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="h-10 px-4 rounded-lg text-sm font-bold bg-primary text-on-primary hover:bg-primary/90 transition-colors cursor-pointer"
          >
            {CLOSE_LABEL}
          </button>
        </footer>
      </div>
    </div>
  );
}
