"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AxiosError } from "axios";
import { useProfile, useUpdateProfile } from "@/api/hooks/profile/profileApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";
import {
  adminProfileSchema,
  driverProfileSchema,
  posterProfileSchema,
  type AdminProfileInput,
  type DriverProfileInput,
  type PosterProfileInput,
  type ProfileResponse,
} from "@/types/profile/profile";
import { DRIVER_VEHICLE_TYPE } from "@/types/driverProfile/driverProfile";

const NAME_LABEL = "Full Name";
const PHONE_LABEL = "Phone Number";
const PHONE_PLACEHOLDER = "98XXXXXXXX";
const DEFAULT_PICKUP_LABEL = "Default Pickup Address";
const DEFAULT_PICKUP_PLACEHOLDER = "e.g. New Baneshwor, Kathmandu";
const OPERATING_ZONE_LABEL = "Operating Zone";
const OPERATING_ZONE_PLACEHOLDER = "e.g. Kathmandu Valley";
const NAME_PLACEHOLDER = "Your full name";
const PREFERRED_LANGUAGE_LABEL = "Preferred Language";
const ENGLISH_LABEL = "English";
const NEPALI_LABEL = "नेपाली";
const VEHICLE_TYPE_LABEL = "Vehicle Type";
const EMAIL_LABEL = "Email";
const EMAIL_LOCKED_HELPER = "Email cannot be changed";
const SUBMIT_BUTTON_LABEL = "Save Changes";
const SUBMITTING_BUTTON_LABEL = "Saving...";
const UPLOADING_LABEL = "Uploading...";
const GENERIC_ERROR_FALLBACK = "Failed to update profile";
const PROFILE_PHOTO_ALT = "Profile photo";
const CAMERA_ICON = "photo_camera";
const PROFILE_PHOTO_FOLDER = "profile-photos";
const DRIVER_VEHICLE_TYPE_LABELS: Record<string, string> = {
  [DRIVER_VEHICLE_TYPE.BIKE]: "Motorcycle",
  [DRIVER_VEHICLE_TYPE.CAR]: "Car",
  [DRIVER_VEHICLE_TYPE.VAN]: "Van",
  [DRIVER_VEHICLE_TYPE.TRUCK]: "Truck",
};
const VEHICLE_TYPE_OPTIONS = Object.values(DRIVER_VEHICLE_TYPE);
const LANGUAGE_OPTIONS: ReadonlyArray<{ value: "en" | "ne"; label: string }> = [
  { value: "en", label: ENGLISH_LABEL },
  { value: "ne", label: NEPALI_LABEL },
];

const AVATAR_SIZE_PX = 80;
const PROFILE_HEADING = "Edit Profile";

const INPUT_CLASS =
  "w-full h-12 px-4 rounded-lg border border-outline-variant text-sm text-on-surface " +
  "focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 " +
  "transition-all bg-surface-white";

const LOCKED_INPUT_CLASS =
  "w-full h-12 px-12 rounded-lg border border-outline-variant text-sm text-on-surface " +
  "bg-[var(--color-surface-container)] cursor-not-allowed";

const SUBMIT_BUTTON_CLASS =
  "h-12 px-4 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors " +
  "flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const ERROR_BOX_CLASS =
  "p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg";

const OPTION_ACTIVE_CLASS =
  "border-primary bg-[var(--color-primary-container)]/15 text-on-surface";
const OPTION_INACTIVE_CLASS =
  "border-outline-variant bg-surface-white text-secondary hover:bg-surface-container-low";

type EditProfileRole = "poster" | "driver" | "admin";

interface EditProfileFormProps {
  role: EditProfileRole;
}

interface CloudinarySignResponse {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  public_id: string;
  folder: string;
}

interface CloudinaryUploadResponse {
  secure_url: string;
}

function getInitialsFromName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

function AvatarUploader({
  photoUrl,
  initials,
  isUploading,
  onChange,
}: {
  photoUrl: string | null;
  initials: string;
  isUploading: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="flex items-center gap-6">
      <div className="relative group shrink-0">
        <div
          className="rounded-full bg-primary text-white flex items-center justify-center font-bold text-2xl overflow-hidden border border-outline-variant"
          style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={PROFILE_PHOTO_ALT}
              width={AVATAR_SIZE_PX}
              height={AVATAR_SIZE_PX}
              className="object-cover w-full h-full"
              unoptimized
            />
          ) : (
            initials
          )}
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-2xl animate-spin">
                progress_activity
              </span>
            </div>
          )}
        </div>
        <label
          className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Upload profile photo"
        >
          <span className="material-symbols-outlined text-white text-2xl">
            {CAMERA_ICON}
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            disabled={isUploading}
            className="hidden"
          />
        </label>
      </div>
      <div className="text-sm text-secondary">
        {isUploading ? UPLOADING_LABEL : PROFILE_HEADING}
      </div>
    </div>
  );
}

function EmailLockedField({ email }: { email: string }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-secondary block">{EMAIL_LABEL}</label>
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-xl pointer-events-none">
          lock
        </span>
        <input
          type="email"
          value={email}
          readOnly
          aria-readonly
          disabled
          className={LOCKED_INPUT_CLASS}
        />
      </div>
      <p className="text-xs text-secondary">{EMAIL_LOCKED_HELPER}</p>
    </div>
  );
}

function LanguageToggle({
  value,
  onChange,
  error,
}: {
  value: "en" | "ne";
  onChange: (next: "en" | "ne") => void;
  error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-secondary block">
        {PREFERRED_LANGUAGE_LABEL}
      </label>
      <div className="grid grid-cols-2 gap-2">
        {LANGUAGE_OPTIONS.map((option) => {
          const isActive = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={`h-12 rounded-lg border text-sm font-bold transition-colors ${
                isActive ? OPTION_ACTIVE_CLASS : OPTION_INACTIVE_CLASS
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      {error && <p className="text-sm text-error-red mt-1">{error}</p>}
    </div>
  );
}

function SubmitButton({ isSubmitting }: { isSubmitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={isSubmitting}
      className={SUBMIT_BUTTON_CLASS}
    >
      <span className="material-symbols-outlined text-xl">save</span>
      {isSubmitting ? SUBMITTING_BUTTON_LABEL : SUBMIT_BUTTON_LABEL}
    </button>
  );
}

function ProfileSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-[var(--color-surface-container-high)] rounded" />
      <div className="flex items-center gap-6">
        <div
          className="rounded-full bg-[var(--color-surface-container-high)]"
          style={{ width: AVATAR_SIZE_PX, height: AVATAR_SIZE_PX }}
        />
        <div className="h-4 w-40 bg-[var(--color-surface-container-high)] rounded" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="h-4 w-24 bg-[var(--color-surface-container-high)] rounded" />
            <div className="h-12 w-full bg-[var(--color-surface-container-high)] rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  );
}

function usePhotoUploader(profile: ProfileResponse | undefined) {
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const userId = profile?._id;

  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return null;

      setPhotoError(null);
      setIsUploadingPhoto(true);
      try {
        const signResponse = await fetch("/api/uploads/profile-photo-sign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (!signResponse.ok) throw new Error("Failed to get upload signature");
        const sign = (await signResponse.json()) as CloudinarySignResponse;
        const folder = `${PROFILE_PHOTO_FOLDER}/${userId ?? "unknown"}`;
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", sign.apiKey);
        formData.append("timestamp", String(sign.timestamp));
        formData.append("signature", sign.signature);
        formData.append("public_id", sign.public_id);
        formData.append("folder", folder);

        const uploadResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`,
          { method: "POST", body: formData }
        );
        if (!uploadResponse.ok) throw new Error("Cloudinary upload failed");
        const uploaded = (await uploadResponse.json()) as CloudinaryUploadResponse;
        return uploaded.secure_url;
      } catch (error: unknown) {
        setPhotoError(error instanceof Error ? error.message : "Failed to upload photo");
        return null;
      } finally {
        setIsUploadingPhoto(false);
        if (event.target) event.target.value = "";
      }
    },
    [userId]
  );

  return { isUploadingPhoto, photoError, handlePhotoChange };
}

function PosterForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploader = usePhotoUploader(profile);

  const form = useForm<PosterProfileInput>({
    resolver: zodResolver(posterProfileSchema),
    defaultValues: {
      name: profile?.name ?? "",
      preferredLanguage: profile?.preferredLanguage ?? "en",
      phone: profile?.phone ?? "",
      profilePhotoUrl: profile?.profilePhotoUrl ?? "",
      defaultPickupAddress: profile?.defaultPickupAddress ?? "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      name: profile.name,
      preferredLanguage: profile.preferredLanguage,
      phone: profile.phone ?? "",
      profilePhotoUrl: profile.profilePhotoUrl ?? "",
      defaultPickupAddress: profile.defaultPickupAddress ?? "",
    });
  }, [profile, form]);

  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const url = await uploader.handlePhotoChange(event);
      if (url) form.setValue("profilePhotoUrl", url, { shouldDirty: true });
    },
    [uploader, form]
  );

  const onSubmit = useCallback(
    async (data: PosterProfileInput) => {
      try {
        await updateProfileMutation.mutateAsync(data);
      } catch (error) {
        if (error instanceof AxiosError) {
          throw new Error(getBackendErrorMessage(error, GENERIC_ERROR_FALLBACK));
        }
        throw error;
      }
    },
    [updateProfileMutation]
  );

  const watchedName = form.watch("name");
  const watchedLanguage = form.watch("preferredLanguage");
  const watchedPhotoUrl = form.watch("profilePhotoUrl");
  const initials = useMemo(() => getInitialsFromName(watchedName ?? ""), [watchedName]);

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-on-surface">{PROFILE_HEADING}</h2>
      {uploader.photoError && <div className={ERROR_BOX_CLASS}>{uploader.photoError}</div>}
      <AvatarUploader
        photoUrl={watchedPhotoUrl || null}
        initials={initials}
        isUploading={uploader.isUploadingPhoto}
        onChange={handlePhotoChange}
      />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <EmailLockedField email={profile?.email ?? ""} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{NAME_LABEL}</label>
          <input
            type="text"
            placeholder={NAME_PLACEHOLDER}
            className={INPUT_CLASS}
            aria-invalid={Boolean(form.formState.errors.name)}
            {...form.register("name")}
          />
          {form.formState.errors.name?.message && (
            <p className="text-sm text-error-red mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{PHONE_LABEL}</label>
          <input
            type="tel"
            placeholder={PHONE_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("phone")}
          />
          {form.formState.errors.phone?.message && (
            <p className="text-sm text-error-red mt-1">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">
            {DEFAULT_PICKUP_LABEL}
          </label>
          <input
            type="text"
            placeholder={DEFAULT_PICKUP_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("defaultPickupAddress")}
          />
          {form.formState.errors.defaultPickupAddress?.message && (
            <p className="text-sm text-error-red mt-1">
              {form.formState.errors.defaultPickupAddress.message}
            </p>
          )}
        </div>
        <LanguageToggle
          value={watchedLanguage ?? "en"}
          onChange={(next) => form.setValue("preferredLanguage", next, { shouldDirty: true })}
          error={form.formState.errors.preferredLanguage?.message}
        />
        <SubmitButton isSubmitting={updateProfileMutation.isPending} />
      </form>
    </div>
  );
}

function DriverForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const uploader = usePhotoUploader(profile);

  const form = useForm<DriverProfileInput>({
    resolver: zodResolver(driverProfileSchema),
    defaultValues: {
      name: profile?.name ?? "",
      preferredLanguage: profile?.preferredLanguage ?? "en",
      phone: profile?.phone ?? "",
      profilePhotoUrl: profile?.profilePhotoUrl ?? "",
      vehicleType: profile?.vehicleType ?? DRIVER_VEHICLE_TYPE.BIKE,
      operatingZone: profile?.operatingZone ?? "",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      name: profile.name,
      preferredLanguage: profile.preferredLanguage,
      phone: profile.phone ?? "",
      profilePhotoUrl: profile.profilePhotoUrl ?? "",
      vehicleType: profile.vehicleType ?? DRIVER_VEHICLE_TYPE.BIKE,
      operatingZone: profile.operatingZone ?? "",
    });
  }, [profile, form]);

  const handlePhotoChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const url = await uploader.handlePhotoChange(event);
      if (url) form.setValue("profilePhotoUrl", url, { shouldDirty: true });
    },
    [uploader, form]
  );

  const onSubmit = useCallback(
    async (data: DriverProfileInput) => {
      try {
        await updateProfileMutation.mutateAsync(data);
      } catch (error) {
        if (error instanceof AxiosError) {
          throw new Error(getBackendErrorMessage(error, GENERIC_ERROR_FALLBACK));
        }
        throw error;
      }
    },
    [updateProfileMutation]
  );

  const watchedName = form.watch("name");
  const watchedLanguage = form.watch("preferredLanguage");
  const watchedVehicleType = form.watch("vehicleType");
  const watchedPhotoUrl = form.watch("profilePhotoUrl");
  const initials = useMemo(() => getInitialsFromName(watchedName ?? ""), [watchedName]);

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-on-surface">{PROFILE_HEADING}</h2>
      {uploader.photoError && <div className={ERROR_BOX_CLASS}>{uploader.photoError}</div>}
      <AvatarUploader
        photoUrl={watchedPhotoUrl || null}
        initials={initials}
        isUploading={uploader.isUploadingPhoto}
        onChange={handlePhotoChange}
      />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <EmailLockedField email={profile?.email ?? ""} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{NAME_LABEL}</label>
          <input
            type="text"
            placeholder={NAME_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("name")}
          />
          {form.formState.errors.name?.message && (
            <p className="text-sm text-error-red mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{PHONE_LABEL}</label>
          <input
            type="tel"
            placeholder={PHONE_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("phone")}
          />
          {form.formState.errors.phone?.message && (
            <p className="text-sm text-error-red mt-1">{form.formState.errors.phone.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{VEHICLE_TYPE_LABEL}</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {VEHICLE_TYPE_OPTIONS.map((value) => {
              const isActive = watchedVehicleType === value;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() =>
                    form.setValue("vehicleType", value, { shouldDirty: true })
                  }
                  className={`h-12 rounded-lg border text-sm font-bold transition-colors ${
                    isActive ? OPTION_ACTIVE_CLASS : OPTION_INACTIVE_CLASS
                  }`}
                >
                  {DRIVER_VEHICLE_TYPE_LABELS[value] ?? value}
                </button>
              );
            })}
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">
            {OPERATING_ZONE_LABEL}
          </label>
          <input
            type="text"
            placeholder={OPERATING_ZONE_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("operatingZone")}
          />
        </div>
        <LanguageToggle
          value={watchedLanguage ?? "en"}
          onChange={(next) => form.setValue("preferredLanguage", next, { shouldDirty: true })}
          error={form.formState.errors.preferredLanguage?.message}
        />
        <SubmitButton isSubmitting={updateProfileMutation.isPending} />
      </form>
    </div>
  );
}

function AdminForm() {
  const { data: profile, isLoading } = useProfile();
  const updateProfileMutation = useUpdateProfile();

  const form = useForm<AdminProfileInput>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      name: profile?.name ?? "",
      preferredLanguage: profile?.preferredLanguage ?? "en",
    },
  });

  useEffect(() => {
    if (!profile) return;
    form.reset({
      name: profile.name,
      preferredLanguage: profile.preferredLanguage,
    });
  }, [profile, form]);

  const onSubmit = useCallback(
    async (data: AdminProfileInput) => {
      try {
        await updateProfileMutation.mutateAsync(data);
      } catch (error) {
        if (error instanceof AxiosError) {
          throw new Error(getBackendErrorMessage(error, GENERIC_ERROR_FALLBACK));
        }
        throw error;
      }
    },
    [updateProfileMutation]
  );

  const watchedName = form.watch("name");
  const watchedLanguage = form.watch("preferredLanguage");
  const initials = useMemo(() => getInitialsFromName(watchedName ?? ""), [watchedName]);

  if (isLoading) return <ProfileSkeleton />;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-on-surface">{PROFILE_HEADING}</h2>
      <AvatarUploader
        photoUrl={null}
        initials={initials}
        isUploading={false}
        onChange={() => undefined}
      />
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-6"
      >
        <EmailLockedField email={profile?.email ?? ""} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-secondary block">{NAME_LABEL}</label>
          <input
            type="text"
            placeholder={NAME_PLACEHOLDER}
            className={INPUT_CLASS}
            {...form.register("name")}
          />
          {form.formState.errors.name?.message && (
            <p className="text-sm text-error-red mt-1">{form.formState.errors.name.message}</p>
          )}
        </div>
        <LanguageToggle
          value={watchedLanguage ?? "en"}
          onChange={(next) => form.setValue("preferredLanguage", next, { shouldDirty: true })}
          error={form.formState.errors.preferredLanguage?.message}
        />
        <SubmitButton isSubmitting={updateProfileMutation.isPending} />
      </form>
    </div>
  );
}

export default function EditProfileForm({ role }: EditProfileFormProps) {
  if (role === "poster") return <PosterForm />;
  if (role === "driver") return <DriverForm />;
  return <AdminForm />;
}
