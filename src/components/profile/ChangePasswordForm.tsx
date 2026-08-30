"use client";

import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import type { UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { useChangePassword } from "@/api/hooks/auth/authApi";
import { getBackendErrorMessage } from "@/lib/errorResponse";

const MIN_NEW_PASSWORD_LENGTH = 8;
const CURRENT_PASSWORD_LABEL = "Current Password";
const NEW_PASSWORD_LABEL = "New Password";
const CONFIRM_NEW_PASSWORD_LABEL = "Confirm New Password";
const CURRENT_PASSWORD_PLACEHOLDER = "Enter current password";
const NEW_PASSWORD_PLACEHOLDER = "Enter new password (min. 8 chars)";
const CONFIRM_NEW_PASSWORD_PLACEHOLDER = "Confirm new password";
const SUBMIT_BUTTON_LABEL = "Update Password";
const SUBMITTING_BUTTON_LABEL = "Updating...";
const LOCK_ICON = "lock";
const VISIBILITY_ICON = "visibility";
const VISIBILITY_OFF_ICON = "visibility_off";
const WRONG_CURRENT_PASSWORD_MESSAGE = "Current password is incorrect";
const NEW_PASSWORDS_DO_NOT_MATCH_MESSAGE = "New passwords do not match";
const GENERIC_ERROR_FALLBACK = "Failed to update password";
const CHANGE_PASSWORD_HEADING = "Change Password";

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(MIN_NEW_PASSWORD_LENGTH, `New password must be at least ${MIN_NEW_PASSWORD_LENGTH} characters`),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ["confirmPassword"],
    message: NEW_PASSWORDS_DO_NOT_MATCH_MESSAGE,
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

type PasswordFieldName = "currentPassword" | "newPassword" | "confirmPassword";
type FieldVisibility = Record<PasswordFieldName, boolean>;

const PASSWORD_INPUT_CLASS =
  "w-full h-12 px-4 pr-12 rounded-lg border border-outline-variant text-sm text-on-surface " +
  "focus:outline-none focus:border-2 focus:border-primary placeholder:text-secondary/50 " +
  "transition-all bg-surface-white";

const EYE_TOGGLE_CLASS =
  "absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface p-1 transition-colors cursor-pointer";

const SUBMIT_BUTTON_CLASS =
  "h-12 px-4 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary/90 transition-colors " +
  "flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

const ERROR_BOX_CLASS =
  "p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg";

interface PasswordFieldProps {
  label: string;
  placeholder: string;
  isVisible: boolean;
  onToggle: () => void;
  error?: string;
  register: UseFormRegister<ChangePasswordFormValues>;
  fieldName: keyof ChangePasswordFormValues;
}

function PasswordField({
  label,
  placeholder,
  isVisible,
  onToggle,
  error,
  register,
  fieldName,
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-secondary block">{label}</label>
      <div className="relative">
        <input
          {...register(fieldName)}
          type={isVisible ? "text" : "password"}
          placeholder={placeholder}
          className={PASSWORD_INPUT_CLASS}
          aria-invalid={Boolean(error)}
        />
        <button
          type="button"
          onClick={onToggle}
          className={EYE_TOGGLE_CLASS}
          aria-label={isVisible ? "Hide password" : "Show password"}
        >
          <span className="material-symbols-outlined text-xl">
            {isVisible ? VISIBILITY_OFF_ICON : VISIBILITY_ICON}
          </span>
        </button>
      </div>
      {error && <p className="text-sm text-error-red mt-1">{error}</p>}
    </div>
  );
}

export default function ChangePasswordForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<FieldVisibility>({
    currentPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const changePasswordMutation = useChangePassword();

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const handleToggleVisibility = useCallback(
    (field: PasswordFieldName) => {
      setVisibility((previous) => ({
        ...previous,
        [field]: !previous[field],
      }));
    },
    []
  );

  const handleToggleCurrentPassword = useCallback(
    () => handleToggleVisibility("currentPassword"),
    [handleToggleVisibility]
  );

  const handleToggleNewPassword = useCallback(
    () => handleToggleVisibility("newPassword"),
    [handleToggleVisibility]
  );

  const handleToggleConfirmPassword = useCallback(
    () => handleToggleVisibility("confirmPassword"),
    [handleToggleVisibility]
  );

  const onSubmit = useCallback(
    async (data: ChangePasswordFormValues) => {
      setServerError(null);
      clearErrors();

      try {
        await changePasswordMutation.mutateAsync({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        });
        reset();
      } catch (error) {
        if (error instanceof AxiosError) {
          const message = getBackendErrorMessage(error, GENERIC_ERROR_FALLBACK);

          if (message === WRONG_CURRENT_PASSWORD_MESSAGE) {
            setError("currentPassword", { type: "server", message });
          } else {
            setServerError(message);
          }
        } else {
          setServerError(GENERIC_ERROR_FALLBACK);
        }
      }
    },
    [changePasswordMutation, clearErrors, reset, setError]
  );

  const isSubmittingOrDisabled = isSubmitting || changePasswordMutation.isPending;
  const submitButtonContent = isSubmittingOrDisabled
    ? SUBMITTING_BUTTON_LABEL
    : SUBMIT_BUTTON_LABEL;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-on-surface">{CHANGE_PASSWORD_HEADING}</h2>

      {serverError && <div className={ERROR_BOX_CLASS}>{serverError}</div>}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <PasswordField
          label={CURRENT_PASSWORD_LABEL}
          placeholder={CURRENT_PASSWORD_PLACEHOLDER}
          isVisible={visibility.currentPassword}
          onToggle={handleToggleCurrentPassword}
          error={errors.currentPassword?.message}
          register={register}
          fieldName="currentPassword"
        />

        <PasswordField
          label={NEW_PASSWORD_LABEL}
          placeholder={NEW_PASSWORD_PLACEHOLDER}
          isVisible={visibility.newPassword}
          onToggle={handleToggleNewPassword}
          error={errors.newPassword?.message}
          register={register}
          fieldName="newPassword"
        />

        <PasswordField
          label={CONFIRM_NEW_PASSWORD_LABEL}
          placeholder={CONFIRM_NEW_PASSWORD_PLACEHOLDER}
          isVisible={visibility.confirmPassword}
          onToggle={handleToggleConfirmPassword}
          error={errors.confirmPassword?.message}
          register={register}
          fieldName="confirmPassword"
        />

        <button
          type="submit"
          disabled={isSubmittingOrDisabled}
          className={SUBMIT_BUTTON_CLASS}
        >
          <span className="material-symbols-outlined text-xl">{LOCK_ICON}</span>
          {submitButtonContent}
        </button>
      </form>
    </div>
  );
}
