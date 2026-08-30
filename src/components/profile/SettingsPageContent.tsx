"use client";

import ChangePasswordForm from "@/components/profile/ChangePasswordForm";

const OAUTH_ONLY_MESSAGE = "Password change is not available for Google-linked accounts";
const OAUTH_ONLY_ICON = "lock";
const CONTENT_CARD_CLASS = "w-full bg-surface-white border border-outline-variant rounded-2xl p-8 min-h-[500px]";
const OAUTH_MESSAGE_CLASS = "flex flex-col items-center justify-center py-12 text-center";

interface SettingsPageContentProps {
  hasPassword: boolean;
}

function OAuthOnlyMessage() {
  return (
    <div className={OAUTH_MESSAGE_CLASS}>
      <span className="material-symbols-outlined text-4xl text-secondary mb-4">
        {OAUTH_ONLY_ICON}
      </span>
      <p className="text-secondary">{OAUTH_ONLY_MESSAGE}</p>
    </div>
  );
}

export default function SettingsPageContent({ hasPassword }: SettingsPageContentProps) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className={CONTENT_CARD_CLASS}>
        {hasPassword ? <ChangePasswordForm /> : <OAuthOnlyMessage />}
      </div>
    </div>
  );
}
