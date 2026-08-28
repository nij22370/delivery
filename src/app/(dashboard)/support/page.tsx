"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { toast } from "sonner";

interface ContactChannel {
  id: string;
  icon: string;
  label: string;
  value: string;
  href: string;
  description: string;
  actionLabel: string;
}

interface FormState {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const CONTACT_CHANNELS: ContactChannel[] = [
  {
    id: "email",
    icon: "mail",
    label: "Email",
    value: "sandeshd531@gmail.com",
    href: "https://mail.google.com/mail/?view=cm&to=sandeshd531@gmail.com&subject=SwiftShip+Support+Request",
    description: "Send us an email via Gmail",
    actionLabel: "Open Gmail Compose",
  },
  {
    id: "phone",
    icon: "phone",
    label: "Phone",
    value: "+977 9825360845",
    href: "tel:+9779825360845",
    description: "Call or WhatsApp us",
    actionLabel: "Call Now",
  },
  {
    id: "github",
    icon: "code",
    label: "GitHub",
    value: "github.com/nij22370",
    href: "https://github.com/nij22370",
    description: "Report issues or view source",
    actionLabel: "Open GitHub",
  },
  {
    id: "linkedin",
    icon: "work",
    label: "LinkedIn",
    value: "Sandesh Dhakal",
    href: "https://www.linkedin.com/in/sandesh-dhakal-432420365/",
    description: "Connect professionally",
    actionLabel: "View Profile",
  },
  {
    id: "instagram",
    icon: "camera_alt",
    label: "Instagram",
    value: "@sandesh_dhkal",
    href: "https://www.instagram.com/sandesh_dhkal/",
    description: "Follow for updates",
    actionLabel: "Open Instagram",
  },
];

const CHANNEL_ACCENT_CLASSES: Record<string, { bg: string; icon: string; border: string }> = {
  email: { bg: "bg-primary/10", icon: "text-primary", border: "border-primary/20" },
  phone: { bg: "bg-success-green/10", icon: "text-success-green", border: "border-success-green/20" },
  github: { bg: "bg-[#1e293b]/10", icon: "text-[#1e293b]", border: "border-[#1e293b]/20" },
  linkedin: { bg: "bg-[#0077b5]/10", icon: "text-[#0077b5]", border: "border-[#0077b5]/20" },
  instagram: { bg: "bg-[#e1306c]/10", icon: "text-[#e1306c]", border: "border-[#e1306c]/20" },
};

const INITIAL_FORM_STATE: FormState = {
  name: "",
  email: "",
  subject: "",
  message: "",
};

const SUBJECT_OPTIONS = [
  "Payout Issue",
  "Missing Earnings",
  "Job Dispute",
  "Account Problem",
  "Technical Bug",
  "Feature Request",
  "Other",
];

export default function SupportPage() {
  const { user } = useAuthGuard();
  const [form, setForm] = useState<FormState>({
    ...INITIAL_FORM_STATE,
    email: "",
    name: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefillledForm = useMemo<FormState>(
    () => ({
      ...INITIAL_FORM_STATE,
      name: user?.name ?? "",
      email: user?.email ?? "",
    }),
    [user?.name, user?.email]
  );

  const handleFieldChange = useCallback(
    (field: keyof FormState) =>
      (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setForm((prev) => ({ ...prev, [field]: e.target.value }));
      },
    []
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      setTimeout(() => {
        setIsSubmitting(false);
        setForm(prefillledForm);
        toast.success("Message sent! We'll get back to you within 24 hours.");
      }, 1200);
    },
    [prefillledForm]
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-on-surface">Contact Support</h1>
        <p className="text-sm text-secondary mt-1">
          Reach out through any channel below or send us a message directly.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact channels + FAQ link */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Contact Channels */}
          <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-outline-variant">
              <h2 className="text-sm font-bold text-on-surface">Get in Touch</h2>
              <p className="text-xs text-secondary mt-0.5">Choose your preferred channel</p>
            </div>

            <ul className="divide-y divide-outline-variant">
              {CONTACT_CHANNELS.map((channel) => {
                const accent = CHANNEL_ACCENT_CLASSES[channel.id];
                return (
                  <li key={channel.id}>
                    <a
                      href={channel.href}
                      target={channel.id !== "phone" ? "_blank" : undefined}
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 px-5 py-4 hover:bg-surface-container-low transition-colors group"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${accent.bg} border ${accent.border}`}>
                        <span className={`material-symbols-outlined text-xl ${accent.icon}`}>
                          {channel.icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-secondary uppercase tracking-wider">
                          {channel.label}
                        </p>
                        <p className="text-sm font-semibold text-on-surface truncate">
                          {channel.value}
                        </p>
                        <p className="text-xs text-on-surface-variant mt-0.5">
                          {channel.description}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-base text-on-surface-variant group-hover:text-primary transition-colors shrink-0">
                        open_in_new
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* FAQ Quick Link */}
          <Link
            href="/faq"
            className="flex items-center gap-4 px-5 py-4 bg-primary/5 border border-primary/20 rounded-xl hover:bg-primary/10 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl text-primary">help_outline</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-on-surface">Browse FAQ</p>
              <p className="text-xs text-secondary mt-0.5">Find quick answers to common questions</p>
            </div>
            <span className="material-symbols-outlined text-base text-primary shrink-0">
              arrow_forward
            </span>
          </Link>

          {/* Response times */}
          <div className="bg-surface-white border border-outline-variant rounded-xl p-5 shadow-sm">
            <h3 className="text-xs font-bold text-secondary uppercase tracking-wider mb-3">
              Response Times
            </h3>
            <ul className="flex flex-col gap-3">
              <li className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-success-green" />
                  <span className="text-secondary font-medium">Email / Form</span>
                </div>
                <span className="font-bold text-on-surface">Within 24 hours</span>
              </li>
              <li className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-secondary font-medium">Phone / WhatsApp</span>
                </div>
                <span className="font-bold text-on-surface">Same day</span>
              </li>
              <li className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning-amber" />
                  <span className="text-secondary font-medium">GitHub Issues</span>
                </div>
                <span className="font-bold text-on-surface">1–2 Business Days</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right: Contact form */}
        <div className="lg:col-span-2">
          <div className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-outline-variant">
              <h2 className="text-sm font-bold text-on-surface">Send a Message</h2>
              <p className="text-xs text-secondary mt-0.5">
                Fill in the form and we&apos;ll respond within 24 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Name */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="support-name" className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Your Name
                  </label>
                  <input
                    id="support-name"
                    type="text"
                    value={form.name}
                    onChange={handleFieldChange("name")}
                    placeholder="Sandesh Dhakal"
                    required
                    className="h-10 px-4 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                  />
                </div>

                {/* Email */}
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="support-email" className="text-xs font-bold text-secondary uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    id="support-email"
                    type="email"
                    value={form.email}
                    onChange={handleFieldChange("email")}
                    placeholder="you@example.com"
                    required
                    className="h-10 px-4 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="support-subject" className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Subject
                </label>
                <select
                  id="support-subject"
                  value={form.subject}
                  onChange={handleFieldChange("subject")}
                  required
                  className="h-10 px-4 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary transition-colors cursor-pointer"
                >
                  <option value="">Select a topic...</option>
                  {SUBJECT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="support-message" className="text-xs font-bold text-secondary uppercase tracking-wider">
                  Message
                </label>
                <textarea
                  id="support-message"
                  value={form.message}
                  onChange={handleFieldChange("message")}
                  placeholder="Describe your issue in detail. Include your Job ID if relevant..."
                  required
                  rows={6}
                  className="px-4 py-3 text-sm bg-surface-container-low border border-outline-variant rounded-lg text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none"
                />
              </div>

              <button
                id="support-submit-btn"
                type="submit"
                disabled={isSubmitting}
                className="self-start inline-flex items-center gap-2 px-6 h-11 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <span className="material-symbols-outlined text-base animate-spin">
                      progress_activity
                    </span>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">send</span>
                    Send Message
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
