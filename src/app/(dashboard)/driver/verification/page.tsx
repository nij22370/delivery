"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useDriverVerification, useUpdateDriverVerification } from "@/api/hooks/drivers/driversApi";
import { DRIVER_PROFILE_STATUS, DRIVER_VEHICLE_TYPE } from "@/types/driverProfile/driverProfile";
import type { DriverVehicleType } from "@/types/driverProfile/driverProfile";
import { toast } from "sonner";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { apiFetch } from "@/utils/apiFetch";
import { VEHICLE_ICONS } from "@/lib/constants";

// ── Constants ──────────────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/svg+xml", "application/pdf"];
const ACCEPTED_EXTENSIONS = ".jpg,.jpeg,.png,.svg,.pdf";
const PREVIOUSLY_UPLOADED_FILENAME = "Previously uploaded";

type DocumentType = "licence" | "government_id" | "insurance";

interface UploadedFile {
  url: string;
  filename: string;
}

// ── UploadZone Component ───────────────────────────────────────────────────────
interface UploadZoneProps {
  documentType: DocumentType;
  uploadedFile: UploadedFile | null;
  isDisabled: boolean;
  onFileUploaded: (file: UploadedFile) => void;
  onFileRemoved: () => void;
}

function UploadZone({
  documentType,
  uploadedFile,
  isDisabled,
  onFileUploaded,
  onFileRemoved,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const [isUploadingInternal, setIsUploadingInternal] = useState(false);

  const activelyUploading = isUploadingInternal;

  const processFile = useCallback(async (file: File) => {
    setSizeError(null);

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setSizeError("Invalid file type. Please upload a JPG, PNG, SVG, or PDF.");
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setSizeError("File exceeds 10MB limit. Please choose a smaller file.");
      return;
    }

    try {
      setIsUploadingInternal(true);
      const signRes = await apiFetch("/api/uploads/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType }),
      });
      if (!signRes.ok) throw new Error("Failed to get upload signature");

      const { signature, timestamp, cloudName, apiKey, public_id, folder } = await signRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", timestamp.toString());
      formData.append("signature", signature);
      formData.append("public_id", public_id);
      if (folder) formData.append("folder", folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`,
        { method: "POST", body: formData }
      );
      if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed");

      const uploadData = await uploadRes.json();
      onFileUploaded({ url: uploadData.secure_url, filename: file.name });
      toast.success("File uploaded successfully");
    } catch (err) {
      console.error(err);
      toast.error("Failed to upload file. Please try again.");
    } finally {
      setIsUploadingInternal(false);
      // Reset input so same file can be re-selected after remove
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [documentType, onFileUploaded]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleZoneClick = useCallback((e: React.MouseEvent<HTMLLabelElement>) => {
    // Let the label's native click open the file input.
    // Only stop it if disabled so the input is never activated.
    if (isDisabled || activelyUploading) e.preventDefault();
  }, [isDisabled, activelyUploading]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDisabled && !activelyUploading) setIsDraggingOver(true);
  }, [isDisabled, activelyUploading]);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    if (isDisabled || activelyUploading) return;
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  }, [isDisabled, activelyUploading, processFile]);

  const handleZoneKeyDown = useCallback((e: React.KeyboardEvent<HTMLLabelElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      inputRef.current?.click();
    }
  }, []);

  const handleRemove = useCallback(() => {
    setSizeError(null);
    onFileRemoved();
  }, [onFileRemoved]);

  if (uploadedFile) {
    return (
      <div className="border border-outline-variant rounded-lg p-4 flex items-center justify-between bg-surface-bright">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-10 h-10 rounded bg-success-green/10 flex items-center justify-center text-success-green shrink-0">
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-on-surface truncate">{uploadedFile.filename}</p>
            <a
              href={uploadedFile.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline truncate inline-block w-full"
            >
              View Document
            </a>
          </div>
        </div>
        {!isDisabled && (
          <button
            type="button"
            onClick={handleRemove}
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-error-container hover:text-error-red transition-colors shrink-0 ml-2"
            title="Remove Document"
          >
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
      </div>
    );
  }

  const zoneClasses = [
    "relative w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-all duration-200",
    activelyUploading ? "border-outline-variant opacity-70 cursor-not-allowed" : "cursor-pointer",
    isDraggingOver
      ? "border-primary bg-primary/5"
      : sizeError
      ? "border-error-red bg-error-container/10"
      : "border-outline-variant hover:border-primary-container hover:bg-surface-bright",
  ].join(" ");

  return (
    <div className="space-y-2">
      <label
        className={zoneClasses}
        onClick={handleZoneClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        tabIndex={isDisabled || activelyUploading ? -1 : 0}
        onKeyDown={handleZoneKeyDown}
        aria-label="Upload document"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS}
          className="sr-only"
          onChange={handleInputChange}
          disabled={isDisabled || activelyUploading}
          tabIndex={-1}
        />

        <div
          className={[
            "w-12 h-12 rounded-full flex items-center justify-center mb-4 transition-colors",
            isDraggingOver
              ? "bg-primary/10 text-primary"
              : sizeError
              ? "bg-error-container/20 text-error-red"
              : "bg-surface-container text-on-surface-variant",
          ].join(" ")}
        >
          {activelyUploading ? (
            <svg
              className="animate-spin w-6 h-6"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          ) : (
            <span className="material-symbols-outlined text-[24px]">
              {sizeError ? "error" : isDraggingOver ? "file_download" : "cloud_upload"}
            </span>
          )}
        </div>

        <p className="text-sm font-medium text-on-surface mb-1">
          {activelyUploading
            ? "Uploading..."
            : isDraggingOver
            ? "Drop file here"
            : "Click to upload or drag and drop"}
        </p>
        <p className="text-xs text-on-surface-variant">SVG, PNG, JPG or PDF · Max 10MB</p>
      </label>

      {sizeError && (
        <p className="text-xs text-error-red flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">error</span>
          {sizeError}
        </p>
      )}
    </div>
  );
}

// ── StatusBadge Component ──────────────────────────────────────────────────────
interface StatusBadgeProps {
  isReady: boolean;
  isPending: boolean;
}

function StatusBadge({ isReady, isPending }: StatusBadgeProps) {
  if (isPending && isReady) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-primary-container/10 text-primary-container shrink-0">
        <span className="material-symbols-outlined text-[16px]">pending</span>
        Pending
      </span>
    );
  }
  if (isReady) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-success-green/10 text-success-green shrink-0">
        <span className="material-symbols-outlined text-[16px]">check_circle</span>
        Uploaded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-surface-container text-on-surface-variant shrink-0">
      <span className="material-symbols-outlined text-[16px]">radio_button_unchecked</span>
      Not Started
    </span>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function getSubmitButtonLabel(isApproved: boolean, isPending: boolean): string {
  if (isApproved) return "Verified";
  if (isPending) return "Submitted — Under Review";
  return "Submit for Review";
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function DriverVerificationPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuthGuard();
  const { data: profileResponse, isLoading } = useDriverVerification();
  const updateProfile = useUpdateDriverVerification("Documents submitted for review");
  const unlockProfile = useUpdateDriverVerification("Documents unlocked — you can now re-upload");

  useEffect(() => {
    if (!isAuthLoading && user && user.role !== "driver") {
      router.replace("/");
    }
  }, [user, isAuthLoading, router]);

  const profile = profileResponse?.profile;
  const isPending = profile?.status === DRIVER_PROFILE_STATUS.PENDING;
  const isApproved = profile?.status === DRIVER_PROFILE_STATUS.APPROVED;
  const isRejected = profile?.status === DRIVER_PROFILE_STATUS.REJECTED;
  const isLocked = isPending || isApproved;

  // undefined = use server value, null = explicitly cleared, file = freshly uploaded.
  const [vehicleTypeSelection, setVehicleTypeSelection] = useState<DriverVehicleType | null>(null);
  const [licenceFileSelection, setLicenceFileSelection] = useState<UploadedFile | null | undefined>(undefined);
  const [governmentIdFileSelection, setGovernmentIdFileSelection] = useState<UploadedFile | null | undefined>(undefined);
  const [insuranceFileSelection, setInsuranceFileSelection] = useState<UploadedFile | null | undefined>(undefined);
  const [isBackgroundCheckAuthorizedSelection, setIsBackgroundCheckAuthorizedSelection] = useState<boolean | null>(null);

  const profileLicenceFile = profile?.licenceDocUrl
    ? { url: profile.licenceDocUrl, filename: PREVIOUSLY_UPLOADED_FILENAME }
    : null;
  const profileGovernmentIdFile = profile?.governmentIdDocUrl
    ? { url: profile.governmentIdDocUrl, filename: PREVIOUSLY_UPLOADED_FILENAME }
    : null;
  const profileInsuranceFile = profile?.insuranceDocUrl
    ? { url: profile.insuranceDocUrl, filename: PREVIOUSLY_UPLOADED_FILENAME }
    : null;

  const vehicleType = vehicleTypeSelection ?? profile?.vehicleType ?? DRIVER_VEHICLE_TYPE.BIKE;
  const licenceFile = licenceFileSelection === undefined ? profileLicenceFile : licenceFileSelection;
  const governmentIdFile = governmentIdFileSelection === undefined ? profileGovernmentIdFile : governmentIdFileSelection;
  const insuranceFile = insuranceFileSelection === undefined ? profileInsuranceFile : insuranceFileSelection;
  const isBackgroundCheckAuthorized =
    isBackgroundCheckAuthorizedSelection ?? profile?.backgroundCheck?.authorized ?? false;

  const handleVehicleTypeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVehicleTypeSelection(e.target.value as DriverVehicleType);
  }, []);

  const handleBackgroundCheckChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsBackgroundCheckAuthorizedSelection(e.target.checked);
  }, []);

  const handleSubmit = useCallback(() => {
    updateProfile.mutate({
      status: DRIVER_PROFILE_STATUS.PENDING,
      vehicleType,
      licenceDocUrl: licenceFile?.url,
      governmentIdDocUrl: governmentIdFile?.url,
      insuranceDocUrl: insuranceFile?.url,
      backgroundCheck: {
        authorized: isBackgroundCheckAuthorized,
        authorizedAt: isBackgroundCheckAuthorized ? new Date() : undefined,
      },
    });
  }, [updateProfile, vehicleType, licenceFile, governmentIdFile, insuranceFile, isBackgroundCheckAuthorized]);

  const handleUnlock = useCallback(() => {
    unlockProfile.mutate({ status: DRIVER_PROFILE_STATUS.UNVERIFIED });
  }, [unlockProfile]);

  const handleLicenceFileRemoved = useCallback(() => setLicenceFileSelection(null), []);
  const handleGovernmentIdFileRemoved = useCallback(() => setGovernmentIdFileSelection(null), []);
  const handleInsuranceFileRemoved = useCallback(() => setInsuranceFileSelection(null), []);

  const handleBackToProfile = useCallback(() => {
    router.back();
  }, [router]);

  const showLoading =
    isAuthLoading ||
    isLoading ||
    (user && user.role !== "driver");

  if (showLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-container-low">
        <svg className="animate-spin w-8 h-8 text-primary-container" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  const isFormComplete =
    !!licenceFile &&
    !!governmentIdFile &&
    !!insuranceFile &&
    !!vehicleType &&
    isBackgroundCheckAuthorized;

  return (
    <div className="min-h-screen flex flex-col bg-surface-container-low text-on-surface antialiased">
      <header className="w-full h-16 bg-surface-white border-b border-outline-variant z-50 sticky top-0">
        <div className="flex justify-between items-center px-4 md:px-8 max-w-7xl mx-auto h-full">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">local_shipping</span>
            <span className="text-2xl font-bold text-primary">SwiftShip</span>
          </div>
          <div className="flex items-center gap-4">
            <button type="button" className="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors hidden md:block cursor-pointer">
              Save &amp; Exit
            </button>
            <button type="button" className="text-sm font-medium text-on-surface-variant hover:text-primary-container transition-colors flex items-center gap-1 cursor-pointer">
              <span className="material-symbols-outlined text-[20px]">help</span>
              <span className="hidden md:inline">Support</span>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <div className="mb-8 max-w-3xl">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider">Step 3 of 4</span>
            <div className="flex-grow h-1.5 bg-secondary-container rounded-full overflow-hidden">
              <div className="h-full bg-primary-container w-3/4 rounded-full" />
            </div>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-on-surface mb-3 tracking-tight">
            Get Verified to Start Driving
          </h1>
          <p className="text-lg text-on-surface-variant">
            Upload your required documents below. We use secure encryption to ensure your personal information remains private and safe.
          </p>
        </div>

        {isApproved && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-success-green/10 border border-success-green/30 rounded-lg">
            <span className="material-symbols-outlined text-success-green text-[22px] mt-0.5 shrink-0">verified</span>
            <div>
              <p className="text-sm font-semibold text-success-green">You are verified</p>
              <p className="text-sm text-on-surface-variant">Your documents have been reviewed and approved. You can start accepting deliveries.</p>
            </div>
          </div>
        )}

        {isPending && !isApproved && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-primary-container/10 border border-primary-container/30 rounded-lg">
            <span className="material-symbols-outlined text-primary-container text-[22px] mt-0.5 shrink-0">pending</span>
            <div>
              <p className="text-sm font-semibold text-primary-container">Your documents are under review</p>
              <p className="text-sm text-on-surface-variant">We are reviewing your submission. This typically takes 1–3 business days. You will be notified once verified.</p>
            </div>
          </div>
        )}

        {isRejected && (
          <div className="mb-6 flex items-start gap-3 p-4 bg-error-red/10 border border-error-red/30 rounded-lg">
            <span className="material-symbols-outlined text-error-red text-[22px] mt-0.5 shrink-0">error</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-error-red">Your application was rejected</p>
              <p className="text-sm text-on-surface-variant">
                {profile?.rejectionReason || "Please review your documents and resubmit."}
              </p>
              <button
                type="button"
                onClick={handleUnlock}
                className="mt-3 inline-flex items-center gap-1 px-4 h-12 border border-error-red/50 text-error-red text-sm font-medium rounded-lg hover:bg-error-container/40 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[18px]">edit</span>
                Update Documents
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 flex flex-col gap-6">

            {/* Vehicle Selection */}
            <section className="bg-surface-white border border-surface-variant rounded-lg p-4 md:p-6 shadow-sm">
              <div className="mb-6 border-b border-surface-container pb-4">
                <h2 className="text-2xl font-semibold text-on-surface mb-1">Vehicle Selection</h2>
                <p className="text-base text-on-surface-variant">What type of vehicle will you be driving?</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.values(DRIVER_VEHICLE_TYPE).map((type) => (
                  <label
                    key={type}
                    className={[
                      "flex flex-col items-center justify-center p-4 border rounded-lg cursor-pointer transition-colors",
                      vehicleType === type
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-outline-variant hover:bg-surface-bright text-on-surface-variant",
                    ].join(" ")}
                  >
                    <input
                      type="radio"
                      name="vehicleType"
                      value={type}
                      checked={vehicleType === type}
                      onChange={handleVehicleTypeChange}
                      className="sr-only"
                    />
                    <span className="material-symbols-outlined text-[32px] mb-2">{VEHICLE_ICONS[type]}</span>
                    <span className="text-sm font-medium capitalize">{type}</span>
                  </label>
                ))}
              </div>
            </section>

            {/* Driver's Licence */}
            <section className="bg-surface-white border border-surface-variant rounded-lg p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-surface-container pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-on-surface mb-1">Driver&apos;s Licence</h2>
                  <p className="text-base text-on-surface-variant">Upload your valid Driver&apos;s Licence</p>
                </div>
                <StatusBadge isReady={!!licenceFile} isPending={isLocked} />
              </div>
              <UploadZone
                documentType="licence"
                uploadedFile={licenceFile}
                isDisabled={isLocked}
                onFileUploaded={setLicenceFileSelection}
                onFileRemoved={handleLicenceFileRemoved}
              />
            </section>

            {/* Government ID */}
            <section className="bg-surface-white border border-surface-variant rounded-lg p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-surface-container pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-on-surface mb-1">Government ID</h2>
                  <p className="text-base text-on-surface-variant">Upload your valid Government ID</p>
                </div>
                <StatusBadge isReady={!!governmentIdFile} isPending={isLocked} />
              </div>
              <UploadZone
                documentType="government_id"
                uploadedFile={governmentIdFile}
                isDisabled={isLocked}
                onFileUploaded={setGovernmentIdFileSelection}
                onFileRemoved={handleGovernmentIdFileRemoved}
              />
            </section>

            {/* Vehicle Insurance */}
            <section className="bg-surface-white border border-surface-variant rounded-lg p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-surface-container pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-on-surface mb-1">Vehicle Insurance</h2>
                  <p className="text-base text-on-surface-variant">Current proof of commercial or personal auto insurance</p>
                </div>
                <StatusBadge isReady={!!insuranceFile} isPending={isLocked} />
              </div>
              <UploadZone
                documentType="insurance"
                uploadedFile={insuranceFile}
                isDisabled={isLocked}
                onFileUploaded={setInsuranceFileSelection}
                onFileRemoved={handleInsuranceFileRemoved}
              />
            </section>

            {/* Background Check */}
            <section className="bg-surface-white border border-surface-variant rounded-lg p-4 md:p-6 shadow-sm">
              <div className="flex justify-between items-start mb-6 border-b border-surface-container pb-4">
                <div>
                  <h2 className="text-2xl font-semibold text-on-surface mb-1">Background Check Authorization</h2>
                  <p className="text-base text-on-surface-variant">Standard motor vehicle record check</p>
                </div>
                <StatusBadge isReady={isBackgroundCheckAuthorized} isPending={isLocked} />
              </div>
              <div className="space-y-4">
                <p className="text-base text-on-surface-variant">
                  To ensure safety on our platform, we require a standard motor vehicle record (MVR) check. This check will review your driving history for the past 3–7 years.
                </p>
                <label className="flex items-start gap-3 cursor-pointer p-4 border border-outline-variant rounded-lg bg-surface-bright hover:border-primary-container transition-colors">
                  <input
                    type="checkbox"
                    checked={isBackgroundCheckAuthorized}
                    onChange={handleBackgroundCheckChange}
                    disabled={isLocked}
                    className="mt-1 w-5 h-5 text-primary-container rounded border-outline-variant focus:ring-primary-container focus:ring-offset-0 bg-surface-container cursor-pointer disabled:opacity-50"
                  />
                  <span className="text-sm font-medium text-on-surface">
                    I authorize SwiftShip to conduct a motor vehicle record check and I agree to the Background Check Disclosure.
                  </span>
                </label>
              </div>
            </section>

            {/* Footer Actions */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-surface-variant">
              <button
                type="button"
                onClick={handleBackToProfile}
                className="w-full sm:w-auto px-6 h-12 bg-transparent border border-outline-variant text-on-surface text-sm font-medium rounded hover:bg-surface-container transition-colors flex justify-center items-center cursor-pointer"
              >
                Back to Profile
              </button>
              <div className="flex items-center gap-3">
                {isPending && (
                  <button
                    type="button"
                    onClick={handleUnlock}
                    className="w-full sm:w-auto px-6 h-12 bg-transparent border border-outline-variant text-on-surface text-sm font-medium rounded hover:bg-surface-container transition-colors flex justify-center items-center cursor-pointer"
                  >
                    Update Documents
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!isFormComplete || isLocked}
                  className="w-full sm:w-auto px-8 h-12 bg-primary-container text-on-primary-container text-sm font-medium rounded hover:opacity-90 active:scale-[0.98] transition-all flex justify-center items-center shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {getSubmitButtonLabel(isApproved, isPending)}
                </button>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-surface-white border border-surface-variant rounded-lg p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-success-green/10 rounded-full flex items-center justify-center text-success-green mb-4">
                <span className="material-symbols-outlined text-[32px]">shield_lock</span>
              </div>
              <h3 className="text-2xl font-semibold text-on-surface mb-2">Bank-Grade Security</h3>
              <p className="text-base text-on-surface-variant mb-6">
                Your documents are encrypted using AES-256 and stored securely. We only use this information for background checks and identity verification as required by law.
              </p>
              <div className="w-full h-px bg-surface-container mb-6" />
              <div className="flex items-center gap-2 text-on-surface-variant text-xs font-semibold uppercase tracking-wide">
                <span className="material-symbols-outlined text-[16px]">lock</span>
                End-to-end encrypted
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
