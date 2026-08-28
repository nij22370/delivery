"use client";

import Link from "next/link";
import { JOB_STATUS } from "@/types/job";
import { formatAppliedDate, formatCompletedDate, getInitials } from "@/utils/format";

interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupPhone?: string;
  dropoffAddress: string;
  dropoffPhone?: string;
  createdAt: string;
  updatedAt: string;
}

interface PosterTrackingPanelProps {
  jobId: string;
  job: JobDetail;
  driverName: string;
  ratingAvgDisplay: string;
  vehicleLabel: string;
  vehicleIcon: string;
  handleChatClick: () => void;
}

const DELIVERY_STAGES = [
  { id: "confirmed", title: "Confirmed", description: "Driver assigned" },
  { id: "picked_up", title: "Picked Up", description: "Package with courier" },
  { id: "on_the_way", title: "On the way", description: "En route to dropoff" },
  { id: "dropoff", title: "Dropoff", description: "Delivered to recipient" },
] as const;

type StageId = (typeof DELIVERY_STAGES)[number]["id"];
type StageState = "completed" | "active" | "pending";

const FILLED_ICON_STYLE = { fontVariationSettings: "'FILL' 1" } as const;

function getStageState(status: string, stageId: StageId): StageState {
  switch (status) {
    case JOB_STATUS.ACCEPTED:
      return stageId === "confirmed" ? "completed" : "pending";
    case JOB_STATUS.IN_TRANSIT:
      if (stageId === "confirmed" || stageId === "picked_up") return "completed";
      if (stageId === "on_the_way") return "active";
      return "pending";
    case JOB_STATUS.DELIVERED:
      return "completed";
    default:
      return "pending";
  }
}

function getStageMeta(stageId: StageId, job: JobDetail): string {
  switch (stageId) {
    case "confirmed":
      return formatAppliedDate(job.createdAt);
    case "picked_up":
      return job.pickupAddress;
    case "on_the_way":
      return job.dropoffAddress;
    case "dropoff":
      return job.status === JOB_STATUS.DELIVERED
        ? formatCompletedDate(job.updatedAt)
        : "Awaiting dropoff";
    default:
      return "";
  }
}

function StageNode({
  stage,
  state,
  meta,
  isLast,
}: {
  stage: (typeof DELIVERY_STAGES)[number];
  state: StageState;
  meta: string;
  isLast: boolean;
}) {
  const circleClassName =
    state === "completed"
      ? "w-6 h-6 rounded-full bg-success-green text-surface-white flex items-center justify-center shrink-0"
      : state === "active"
      ? "w-6 h-6 rounded-full bg-surface-white border-2 border-primary flex items-center justify-center shrink-0"
      : "w-6 h-6 rounded-full bg-surface-white border-2 border-secondary-fixed-dim flex items-center justify-center shrink-0";

  const titleClassName =
    state === "active"
      ? "text-sm font-semibold text-primary"
      : "text-sm font-medium text-on-surface";

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={circleClassName}>
          {state === "completed" && (
            <span className="material-symbols-outlined text-sm font-bold" style={FILLED_ICON_STYLE}>
              check
            </span>
          )}
          {state === "active" && (
            <span className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
          )}
        </div>
        {!isLast && <div className="w-px flex-1 bg-surface-container-high my-1" />}
      </div>
      <div className={isLast ? "" : "pb-6"}>
        <p className={titleClassName}>{stage.title}</p>
        <p className="text-xs text-on-surface-variant mt-0.5">{meta}</p>
      </div>
    </div>
  );
}

function CourierCard({
  driverName,
  ratingAvgDisplay,
  vehicleLabel,
  vehicleIcon,
  onChatClick,
}: {
  driverName: string;
  ratingAvgDisplay: string;
  vehicleLabel: string;
  vehicleIcon: string;
  onChatClick: () => void;
}) {
  const initials = getInitials(driverName);

  return (
    <div className="border border-secondary-container rounded-lg p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-primary-container/15 flex items-center justify-center flex-shrink-0">
          <span className="text-base font-bold text-primary">{initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-on-surface truncate">{driverName}</p>
          <p className="text-xs text-on-surface-variant mt-0.5 truncate">
            {vehicleIcon && (
              <span className="material-symbols-outlined text-[14px] align-text-bottom mr-1">
                {vehicleIcon}
              </span>
            )}
            {vehicleLabel} • {ratingAvgDisplay} ★
          </p>
        </div>
        <button
          type="button"
          onClick={onChatClick}
          aria-label="Chat with driver"
          title="Chat with driver"
          className="w-10 h-10 flex items-center justify-center rounded-lg border border-secondary-container text-on-surface-variant hover:bg-surface-container-low hover:text-primary transition-colors cursor-pointer flex-shrink-0"
        >
          <span className="material-symbols-outlined">chat</span>
        </button>
      </div>
    </div>
  );
}

export default function PosterTrackingPanel({
  jobId,
  job,
  driverName,
  ratingAvgDisplay,
  vehicleLabel,
  vehicleIcon,
  handleChatClick,
}: PosterTrackingPanelProps) {
  return (
    <>
      <CourierCard
        driverName={driverName}
        ratingAvgDisplay={ratingAvgDisplay}
        vehicleLabel={vehicleLabel}
        vehicleIcon={vehicleIcon}
        onChatClick={handleChatClick}
      />

      <div className="mt-6">
        <h3 className="text-sm font-semibold text-on-surface mb-4">Delivery Progress</h3>
        <div className="flex flex-col">
          {DELIVERY_STAGES.map((stage, idx) => {
            const state = getStageState(job.status, stage.id);
            const meta = getStageMeta(stage.id, job);
            const isLast = idx === DELIVERY_STAGES.length - 1;
            return (
              <StageNode
                key={stage.id}
                stage={stage}
                state={state}
                meta={meta}
                isLast={isLast}
              />
            );
          })}
        </div>
      </div>

      {/* Quick Actions for Chat, Dispute, Payment, and Rate */}
      <div className="pt-4 mt-6 border-t border-secondary-container/60 flex flex-col gap-2">
        <p className="text-xs font-semibold text-secondary uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {job.status !== JOB_STATUS.POSTED && (
            <button
              type="button"
              onClick={handleChatClick}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-secondary-container bg-surface-white text-xs font-semibold text-on-surface hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">chat</span>
              Live Chat
            </button>
          )}
          {job.status === JOB_STATUS.POSTED && (
            <Link
              href={`/payment?jobId=${jobId}`}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-surface-tint transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">credit_card</span>
              Pay Now
            </Link>
          )}
          {job.status === JOB_STATUS.DELIVERED && (
            <Link
              href={`/jobs/${jobId}/rate`}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-amber-300 bg-amber-50 text-xs font-semibold text-amber-900 hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">star</span>
              Rate Courier
            </Link>
          )}
          {job.status !== JOB_STATUS.POSTED && (
            <Link
              href={`/jobs/${jobId}/dispute`}
              className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-error-red/20 bg-error-red/5 text-xs font-semibold text-error-red hover:bg-error-red/10 transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px]">report_problem</span>
              Dispute
            </Link>
          )}
          <Link
            href={`/jobs/${jobId}`}
            className="flex items-center justify-center gap-1.5 h-10 px-3 rounded-lg border border-secondary-container bg-surface-white text-xs font-semibold text-secondary hover:text-on-surface transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">info</span>
            Details
          </Link>
        </div>
      </div>
    </>
  );
}
