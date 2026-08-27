"use client";

import { use, useState, useCallback, useMemo, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { formatNpr } from "@/utils/format";
import { JOB_STATUS } from "@/types/job";

// ── Constants ────────────────────────────────────────────────────────────────
const MIN_DESCRIPTION_LENGTH = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_FILE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type CategoryType = "damaged" | "late" | "payment" | "behavior";

interface CategoryOption {
  id: CategoryType;
  title: string;
  description: string;
  icon: string;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  {
    id: "damaged",
    title: "Damaged Goods",
    description: "Item was damaged during transit or handling.",
    icon: "broken_image",
  },
  {
    id: "late",
    title: "Late Delivery",
    description: "Delivery arrived significantly past agreed SLA.",
    icon: "schedule",
  },
  {
    id: "payment",
    title: "Payment Discrepancy",
    description: "Issues with agreed amount or extra charges.",
    icon: "payments",
  },
  {
    id: "behavior",
    title: "Inappropriate Behavior",
    description: "Unprofessional conduct by poster or driver.",
    icon: "report",
  },
];

interface JobDetail {
  _id: string;
  posterId: string;
  driverId: string | null;
  status: string;
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
  offeredPrice: number;
  createdAt: string;
}

async function fetchJobById(jobId: string): Promise<JobDetail> {
  const response = await apiFetch(`/api/jobs/${jobId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error((errorData as { message?: string }).message ?? "Failed to load job.");
  }
  const data: { job: JobDetail } = await response.json();
  return data.job;
}

export default function ReportDisputePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading } = useAuthGuard();

  const [disputeCategory, setDisputeCategory] = useState<CategoryType>("damaged");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    data: job,
    isLoading: isJobLoading,
    isError: isJobError,
    error: jobError,
  } = useQuery({
    queryKey: ["job-detail", id],
    queryFn: () => fetchJobById(id),
    enabled: !isAuthLoading,
  });

  const isParticipant = useMemo(() => {
    if (!user || !job) return false;
    return user._id === job.posterId || (Boolean(job.driverId) && user._id === job.driverId);
  }, [user, job]);

  const shortJobId = useMemo(() => {
    if (!job?._id) return "";
    return `SF-${job._id.slice(-6).toUpperCase()}`;
  }, [job?._id]);

  const handleCategorySelect = useCallback((cat: CategoryType) => {
    setDisputeCategory(cat);
  }, []);

  const handleDescriptionChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    setDetailedDescription(e.target.value);
    setErrorMessage(null);
  }, []);

  const handleFileSelect = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    
    // Validate file sizes and types
    const validFiles: File[] = [];
    for (const file of filesArray) {
      if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
        setErrorMessage(`Invalid file type for ${file.name}. Only JPEG, PNG, and WEBP allowed.`);
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(`File ${file.name} exceeds ${MAX_FILE_SIZE_MB}MB size limit.`);
        return;
      }
      validFiles.push(file);
    }
    
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setErrorMessage(null);
  }, []);

  const handleRemoveFile = useCallback((indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  }, []);

  const handleSubmitDispute = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (detailedDescription.trim().length < MIN_DESCRIPTION_LENGTH) {
        setErrorMessage(`Please provide a description of at least ${MIN_DESCRIPTION_LENGTH} characters.`);
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        // 1. If files selected, upload evidence first
        if (selectedFiles.length > 0) {
          const formData = new FormData();
          selectedFiles.forEach((file) => formData.append("files", file));

          const uploadResponse = await apiFetch(`/api/jobs/${id}/evidence`, {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            const uploadErr = await uploadResponse.json().catch(() => ({}));
            throw new Error((uploadErr as { error?: string }).error ?? "Failed to upload evidence files.");
          }
        }

        // 2. Submit the dispute with category prefix
        const selectedCategoryObj = CATEGORY_OPTIONS.find((c) => c.id === disputeCategory);
        const categoryPrefix = selectedCategoryObj ? `[${selectedCategoryObj.title}] ` : "";
        const finalReason = `${categoryPrefix}${detailedDescription.trim()}`;

        const disputeResponse = await apiFetch(`/api/jobs/${id}/dispute`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason: finalReason }),
        });

        if (!disputeResponse.ok) {
          const disputeErr = await disputeResponse.json().catch(() => ({}));
          throw new Error((disputeErr as { error?: string }).error ?? "Failed to flag dispute.");
        }

        // Invalidate queries and navigate back to job page
        queryClient.invalidateQueries({ queryKey: ["job-detail", id] });
        queryClient.invalidateQueries({ queryKey: ["adminDisputes"] });
        queryClient.invalidateQueries({ queryKey: ["myJobs"] });

        router.replace(`/jobs/${id}`);
      } catch (err: unknown) {
        console.error("Dispute submission failed:", err);
        setErrorMessage(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setIsSubmitting(false);
      }
    },
    [detailedDescription, disputeCategory, selectedFiles, id, queryClient, router]
  );

  if (isAuthLoading || isJobLoading) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">
          progress_activity
        </span>
      </div>
    );
  }

  if (isJobError || !job) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
        <div className="text-center bg-surface-white border border-outline-variant rounded-xl p-8 max-w-md w-full">
          <span className="material-symbols-outlined text-5xl text-error-red mb-3 block">
            error_outline
          </span>
          <h1 className="text-xl font-bold text-on-surface mb-2">Job Not Found</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            {jobError instanceof Error ? jobError.message : "The requested job could not be loaded."}
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-surface-container-low flex items-center justify-center p-4">
        <div className="text-center bg-surface-white border border-outline-variant rounded-xl p-8 max-w-md w-full">
          <span className="material-symbols-outlined text-5xl text-warning-amber mb-3 block">
            lock
          </span>
          <h1 className="text-xl font-bold text-on-surface mb-2">Access Denied</h1>
          <p className="text-sm text-on-surface-variant mb-6">
            Only participants (poster or assigned driver) of this job can report a dispute.
          </p>
          <Link
            href={`/jobs/${job._id}`}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-colors cursor-pointer"
          >
            ← View Job Details
          </Link>
        </div>
      </div>
    );
  }

  const isDisputeDisabled = job.status === JOB_STATUS.DISPUTED;

  return (
    <div className="min-h-screen bg-surface-container-low text-on-surface">
      <main className="max-w-[1280px] mx-auto px-4 md:px-8 py-8 md:py-12">
        {/* Breadcrumbs */}
        <nav aria-label="Breadcrumb" className="flex text-on-surface-variant text-sm mb-4">
          <ol className="inline-flex items-center space-x-1 md:space-x-2">
            <li className="inline-flex items-center">
              <Link href="/dashboard" className="hover:text-primary transition-colors cursor-pointer">
                Dashboard
              </Link>
            </li>
            <li>
              <div className="flex items-center">
                <span className="material-symbols-outlined text-base mx-1">chevron_right</span>
                <Link href={`/jobs/${job._id}`} className="hover:text-primary transition-colors cursor-pointer">
                  Job #{shortJobId}
                </Link>
              </div>
            </li>
            <li aria-current="page">
              <div className="flex items-center">
                <span className="material-symbols-outlined text-base mx-1">chevron_right</span>
                <span className="text-on-surface font-semibold">Report a Dispute</span>
              </div>
            </li>
          </ol>
        </nav>

        {/* Page Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            type="button"
            onClick={() => router.back()}
            className="w-10 h-10 flex items-center justify-center hover:bg-surface-variant rounded-full transition-colors text-on-surface cursor-pointer"
          >
            <span className="material-symbols-outlined text-2xl">arrow_back</span>
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-on-surface">Report a Dispute</h1>
            <p className="text-sm text-on-surface-variant mt-1">
              Submit your dispute details and evidence for SwiftShip admin review.
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6 p-4 bg-error-container border border-error-red/40 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-error-red text-xl">error</span>
            <p className="text-sm font-medium text-error-red flex-1">{errorMessage}</p>
          </div>
        )}

        {isDisputeDisabled && (
          <div className="mb-6 p-4 bg-warning-amber/10 border border-warning-amber/40 rounded-xl flex items-center gap-3">
            <span className="material-symbols-outlined text-warning-amber text-2xl">info</span>
            <div>
              <p className="text-sm font-semibold text-warning-amber">Job Already Disputed</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                This job has already been flagged for dispute resolution. Our admin team is currently reviewing it.
              </p>
            </div>
          </div>
        )}

        {/* Main Layout Grid */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Column: Job Summary Panel (360px) */}
          <div className="lg:w-[360px] flex-shrink-0">
            <div className="bg-surface-white border border-outline-variant rounded-xl p-6 shadow-sm sticky top-20">
              <h2 className="text-xl font-semibold text-on-surface mb-6">Job Summary</h2>
              
              <div className="space-y-6">
                <div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    JOB ID
                  </span>
                  <p className="text-base font-bold text-on-surface mt-1">#{shortJobId}</p>
                </div>

                <div className="h-px bg-surface-container-high w-full" />

                {/* Address Timeline */}
                <div className="relative pl-6 space-y-6">
                  <div className="absolute left-1.5 top-2 bottom-2 w-px bg-outline-variant" />
                  
                  {/* Pickup */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full border-2 border-primary bg-surface-white" />
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      PICKUP
                    </span>
                    <p className="text-sm font-medium text-on-surface mt-1 leading-relaxed">
                      {job.pickupAddress}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Contact: {job.pickupContactName}
                    </p>
                  </div>

                  {/* Dropoff */}
                  <div className="relative">
                    <div className="absolute -left-[27px] top-1 w-3 h-3 rounded-full bg-primary" />
                    <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                      DROPOFF
                    </span>
                    <p className="text-sm font-medium text-on-surface mt-1 leading-relaxed">
                      {job.dropoffAddress}
                    </p>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Contact: {job.dropoffContactName}
                    </p>
                  </div>
                </div>

                <div className="h-px bg-surface-container-high w-full" />

                <div>
                  <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                    AGREED PRICE
                  </span>
                  <p className="text-2xl font-bold text-on-surface mt-1">
                    {formatNpr(job.offeredPrice)}
                  </p>
                </div>

                {/* 72h Rule Banner */}
                <div className="bg-tertiary-fixed/30 p-4 rounded-lg border border-tertiary-fixed-dim">
                  <div className="flex gap-3">
                    <span className="material-symbols-outlined text-tertiary text-xl mt-0.5">
                      info
                    </span>
                    <p className="text-xs text-on-tertiary-fixed-variant leading-relaxed">
                      Disputes must be filed within 72 hours of delivery completion.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: 3-Step Dispute Form */}
          <div className="flex-1">
            <div className="bg-surface-white border border-outline-variant rounded-xl p-6 md:p-8 shadow-sm">
              <form onSubmit={handleSubmitDispute}>
                <div className="space-y-10">
                  {/* Step 1: Category */}
                  <div>
                    <h3 className="text-xl font-semibold text-on-surface mb-2 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                        1
                      </span>
                      Dispute Category
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-6 ml-11">
                      Select the primary reason for this dispute.
                    </p>
                    
                    <div className="ml-11 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {CATEGORY_OPTIONS.map((cat) => {
                        const isSelected = disputeCategory === cat.id;
                        return (
                          <label
                            key={cat.id}
                            className={`relative flex cursor-pointer rounded-xl border-2 p-4 shadow-sm transition-all ${
                              isSelected
                                ? "border-primary bg-primary/5"
                                : "border-outline-variant bg-surface-white hover:bg-surface-container-low"
                            }`}
                            onClick={() => handleCategorySelect(cat.id)}
                          >
                            <input
                              type="radio"
                              name="dispute_category"
                              value={cat.id}
                              checked={isSelected}
                              onChange={() => handleCategorySelect(cat.id)}
                              className="sr-only"
                              disabled={isDisputeDisabled || isSubmitting}
                            />
                            <div className="flex flex-col flex-1">
                              <span className="font-semibold text-sm text-on-surface mb-1 flex items-center gap-2">
                                <span className="material-symbols-outlined text-lg text-primary">
                                  {cat.icon}
                                </span>
                                {cat.title}
                              </span>
                              <span className="text-xs text-on-surface-variant leading-relaxed">
                                {cat.description}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="h-px bg-surface-container-high w-full ml-11" />

                  {/* Step 2: Description */}
                  <div>
                    <h3 className="text-xl font-semibold text-on-surface mb-2 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                        2
                      </span>
                      Detailed Description
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-6 ml-11">
                      Please provide as much detail as possible to help us resolve this quickly.
                    </p>
                    <div className="ml-11">
                      <textarea
                        value={detailedDescription}
                        onChange={handleDescriptionChange}
                        disabled={isDisputeDisabled || isSubmitting}
                        placeholder="Explain what happened..."
                        rows={5}
                        className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest p-4 text-sm focus:outline-none focus:border-2 focus:border-primary resize-none"
                      />
                      <div className="flex items-center justify-between mt-2 text-xs text-on-surface-variant">
                        <span>
                          {detailedDescription.trim().length < MIN_DESCRIPTION_LENGTH
                            ? `At least ${MIN_DESCRIPTION_LENGTH - detailedDescription.trim().length} more characters needed`
                            : "Description length sufficient"}
                        </span>
                        <span>{detailedDescription.trim().length} characters</span>
                      </div>
                    </div>
                  </div>

                  <div className="h-px bg-surface-container-high w-full ml-11" />

                  {/* Step 3: Evidence Upload */}
                  <div>
                    <h3 className="text-xl font-semibold text-on-surface mb-2 flex items-center gap-3">
                      <span className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-sm">
                        3
                      </span>
                      Evidence Upload
                    </h3>
                    <p className="text-sm text-on-surface-variant mb-6 ml-11">
                      Attach photos of damaged items, screenshots of chat logs, or supporting documents.
                    </p>
                    
                    <div className="ml-11 space-y-4">
                      {/* Drag & Drop Container */}
                      <label className="flex justify-center rounded-xl border-2 border-dashed border-outline-variant bg-surface-container-low px-6 py-8 hover:bg-surface-container-high transition-colors cursor-pointer group">
                        <div className="text-center">
                          <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors">
                            cloud_upload
                          </span>
                          <div className="mt-3 flex text-sm text-on-surface-variant justify-center">
                            <span className="font-semibold text-primary group-hover:underline">
                              Upload files
                            </span>
                            <span className="pl-1">or drag and drop</span>
                          </div>
                          <p className="text-xs text-on-surface-variant mt-1">
                            PNG, JPG, WEBP up to 5MB per file
                          </p>
                        </div>
                        <input
                          type="file"
                          multiple
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleFileSelect}
                          disabled={isDisputeDisabled || isSubmitting}
                          className="sr-only"
                        />
                      </label>

                      {/* Selected Files List */}
                      {selectedFiles.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">
                            Selected Evidence ({selectedFiles.length})
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {selectedFiles.map((file, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-3 bg-surface-container-low border border-outline-variant rounded-lg"
                              >
                                <div className="flex items-center gap-2 overflow-hidden">
                                  <span className="material-symbols-outlined text-primary text-lg flex-shrink-0">
                                    image
                                  </span>
                                  <span className="text-xs font-medium text-on-surface truncate">
                                    {file.name}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveFile(idx)}
                                  className="text-on-surface-variant hover:text-error-red p-1 rounded transition-colors cursor-pointer"
                                >
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Submit / Cancel Actions */}
                <div className="mt-12 ml-11 flex flex-col sm:flex-row items-center gap-4">
                  <button
                    type="submit"
                    disabled={
                      isDisputeDisabled ||
                      isSubmitting ||
                      detailedDescription.trim().length < MIN_DESCRIPTION_LENGTH
                    }
                    className="w-full sm:w-auto h-12 bg-primary text-on-primary hover:bg-primary-container transition-colors font-semibold text-sm px-8 rounded-lg shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">
                          progress_activity
                        </span>
                        Submitting Dispute...
                      </>
                    ) : (
                      <>
                        Submit Dispute
                        <span className="material-symbols-outlined text-lg">check_circle</span>
                      </>
                    )}
                  </button>

                  <Link
                    href={`/jobs/${job._id}`}
                    className="w-full sm:w-auto h-12 flex items-center justify-center bg-transparent text-on-surface border border-outline-variant hover:bg-surface-container-low transition-colors font-semibold text-sm px-8 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </Link>
                </div>

                {/* Footer Security Note */}
                <p className="ml-11 mt-6 text-xs text-on-surface-variant flex items-center gap-2">
                  <span className="material-symbols-outlined text-base text-primary">
                    verified_user
                  </span>
                  Disputes are reviewed by the SwiftShip Admin team within 24-48 hours.
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
