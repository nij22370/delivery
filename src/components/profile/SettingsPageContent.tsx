"use client";

import { useState } from "react";
import ChangePasswordForm from "@/components/profile/ChangePasswordForm";
import EditProfileForm from "@/components/profile/EditProfileForm";
import { useAuth } from "@/hooks/useAuth";

const OAUTH_ONLY_MESSAGE = "Password change is not available for Google-linked accounts";
const OAUTH_ONLY_ICON = "lock";
const CONTENT_CARD_CLASS = "w-full bg-surface-white border border-outline-variant rounded-2xl p-8 min-h-[500px]";
const OAUTH_MESSAGE_CLASS = "flex flex-col items-center justify-center py-12 text-center";

const EDIT_PROFILE_TAB_ID = "edit-profile" as const;
const CHANGE_PASSWORD_TAB_ID = "change-password" as const;

type SettingsTab = typeof EDIT_PROFILE_TAB_ID | typeof CHANGE_PASSWORD_TAB_ID;

const EDIT_PROFILE_TAB_LABEL = "Edit Profile";
const CHANGE_PASSWORD_TAB_LABEL = "Change Password";
const EDIT_PROFILE_ICON = "person";
const CHANGE_PASSWORD_ICON = "lock";

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

const TAB_BASE_CLASS =
  "flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-sm font-bold " +
  "transition-colors border cursor-pointer";

const TAB_ACTIVE_CLASS = "bg-primary text-on-primary border-primary shadow-sm";

const TAB_INACTIVE_CLASS =
  "bg-surface-white text-secondary border-outline-variant hover:bg-surface-container-low";

export default function SettingsPageContent({ hasPassword }: SettingsPageContentProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<SettingsTab>(EDIT_PROFILE_TAB_ID);

  const role = user?.role;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setActiveTab(EDIT_PROFILE_TAB_ID)}
          className={`${TAB_BASE_CLASS} ${
            activeTab === EDIT_PROFILE_TAB_ID ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
          }`}
          aria-pressed={activeTab === EDIT_PROFILE_TAB_ID}
        >
          <span className="material-symbols-outlined text-xl">{EDIT_PROFILE_ICON}</span>
          {EDIT_PROFILE_TAB_LABEL}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab(CHANGE_PASSWORD_TAB_ID)}
          className={`${TAB_BASE_CLASS} ${
            activeTab === CHANGE_PASSWORD_TAB_ID ? TAB_ACTIVE_CLASS : TAB_INACTIVE_CLASS
          }`}
          aria-pressed={activeTab === CHANGE_PASSWORD_TAB_ID}
        >
          <span className="material-symbols-outlined text-xl">{CHANGE_PASSWORD_ICON}</span>
          {CHANGE_PASSWORD_TAB_LABEL}
        </button>
      </div>

      <div className={CONTENT_CARD_CLASS}>
        {activeTab === EDIT_PROFILE_TAB_ID && role && <EditProfileForm role={role} />}
        {activeTab === CHANGE_PASSWORD_TAB_ID &&
          (hasPassword ? <ChangePasswordForm /> : <OAuthOnlyMessage />)}
      </div>
    </div>
  );
}
