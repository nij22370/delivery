"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";

// ── Constants ───────────────────────────────────────────────────────────────
const REGISTER_ENDPOINT = "/api/auth/register";
const POST_REGISTER_REDIRECT = "/login?registered=true";
const FALLBACK_ERROR_MESSAGE = "Registration failed. Please try again.";

const HERO_IMAGE_URL =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAkBn8JRX3DOPvZmXMyT2o8q3UywNcgnCxKAJbKQ-JQJplK-wDhhg_d6kwdS-8XbJgWTe3rTO-e3FmDkoIFRQiFXWyo5YE5T75bSeJwbUA3tH7TRYWT2wFOCmfp1h2HLjKuwN7JzleNZqEHzhEt95uEuLGYBkr17uNkSHILZxrsDZ9LpSnjad0tvfszWBSgKMWGwKyQ_K2B7HV4h2Dohg4IxQDDA0tLMKBrRuX1ovY6zvvtegl0V2RjDJgSg_vHvxdMkSQXvCnBskA";

// ── Validation Schema ───────────────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters long"),
  role: z.enum(["poster", "driver", "admin"]),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────────
function getSubmitButtonContent(
  isSubmitting: boolean,
  isSuccess: boolean
): React.ReactNode {
  if (isSubmitting) {
    return (
      <>
        <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
        Processing...
      </>
    );
  }
  if (isSuccess) {
    return (
      <>
        <span className="material-symbols-outlined text-xl">check</span>
        Success!
      </>
    );
  }
  return (
    <>
      Create Account
      <span className="material-symbols-outlined text-xl">arrow_forward</span>
    </>
  );
}

// ── Component ───────────────────────────────────────────────────────────────
export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: "poster" },
  });

  const handleTogglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((previous) => !previous);
  }, []);

  const handleToggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen((previous) => !previous);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const onSubmit = useCallback(
    async (data: RegisterFormValues) => {
      setIsSubmitting(true);
      setServerError(null);
      try {
        const response = await fetch(REGISTER_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const responseData = await response.json();
        if (!response.ok) {
          throw new Error(responseData.message || FALLBACK_ERROR_MESSAGE);
        }
        setIsSuccess(true);
        router.push(POST_REGISTER_REDIRECT);
      } catch (error: unknown) {
        const message =
          error instanceof Error ? error.message : FALLBACK_ERROR_MESSAGE;
        setServerError(message);
        setIsSubmitting(false);
      }
    },
    [router]
  );

  const submitButtonClassName = [
    "w-full h-12 rounded-lg text-sm font-bold transition-all duration-200",
    "flex items-center justify-center gap-2 text-on-primary",
    "active:scale-[0.98] disabled:opacity-75",
    isSuccess ? "bg-success-green" : "bg-primary hover:bg-primary-container",
  ].join(" ");

  return (
    <div className="min-h-screen flex flex-col text-on-surface bg-surface-white">

      {/* ── Top Navigation ──────────────────────────────── */}
      <header className="bg-surface-white w-full h-16 border-b border-outline-variant z-50 shrink-0">
        <div className="flex justify-between items-center px-4 md:px-8 max-w-[1280px] mx-auto h-full">

          <span className="text-xl font-bold text-primary">SwiftShip</span>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex gap-8 items-center">
            <Link href="#" className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
              Find Jobs
            </Link>
            <Link href="#" className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
              Post Delivery
            </Link>
            <Link href="#" className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
              How it Works
            </Link>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex gap-3 items-center">
            <Link href="/login" className="text-sm text-on-surface-variant font-medium hover:text-primary transition-colors">
              Login
            </Link>
            <button className="bg-primary text-on-primary px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all active:scale-95 cursor-pointer">
              Post a Job
            </button>
          </div>

          {/* Mobile: Login + Hamburger */}
          <div className="flex md:hidden items-center gap-2">
            <Link
              href="/login"
              className="text-sm text-on-surface-variant font-medium px-3 py-2 hover:text-primary transition-colors"
            >
              Login
            </Link>
            <button
              onClick={handleToggleMobileMenu}
              className="p-2 text-on-surface rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-2xl">
                {isMobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-surface-white border-b border-outline-variant shadow-md">
            <nav className="flex flex-col px-4 py-3 gap-1">
              <Link
                href="#"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                Find Jobs
              </Link>
              <Link
                href="#"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                Post Delivery
              </Link>
              <Link
                href="#"
                onClick={handleCloseMobileMenu}
                className="text-sm text-on-surface font-medium py-3 border-b border-outline-variant/50 hover:text-primary transition-colors"
              >
                How it Works
              </Link>
              <div className="pt-3 pb-1">
                <button className="w-full bg-primary text-on-primary h-12 rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer">
                  Post a Job
                </button>
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ── Main Split Layout ────────────────────────────── */}
      <main className="flex-1 flex flex-col md:flex-row">

        {/* Left — Visual Panel (desktop only) */}
        <div className="hidden md:flex md:w-1/2 bg-surface-container-low flex-col justify-center p-12">
          <div className="max-w-lg">
            <h2 className="text-4xl font-bold text-on-surface mb-6 leading-tight tracking-tight">
              Empowering the<br />Future of Logistics
            </h2>
            <p className="text-lg text-on-surface-variant mb-10 leading-relaxed">
              Whether you're sending across the city or driving across the state,
              SwiftShip provides the platform for precision and reliability.
            </p>
            <div className="w-full aspect-video rounded-xl bg-surface-white border border-outline-variant shadow-sm overflow-hidden relative">
              <Image
                fill
                className="object-cover"
                alt="A professional courier handing a parcel to a business professional in a bright corporate lobby."
                src={HERO_IMAGE_URL}
              />
            </div>
          </div>
        </div>

        {/* Right — Form Panel */}
        <div className="w-full md:w-1/2 flex flex-col justify-center bg-surface-white px-4 py-8 md:px-16 md:py-12">
          <div className="max-w-md w-full mx-auto">

            <header className="mb-8 md:mb-10">
              <h1 className="text-2xl md:text-3xl font-bold md:font-semibold text-on-surface mb-2 leading-tight">
                Join the Delivery Network
              </h1>
              <p className="text-sm md:text-base text-on-surface-variant">
                Connect as a Poster or a Driver
              </p>
            </header>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

              {serverError && (
                <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
                  {serverError}
                </div>
              )}

              {/* Role Selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-on-surface block">
                  Choose your role
                </label>
                <div className="grid grid-cols-2 gap-3">

                  <label className="relative block cursor-pointer group">
                    <input {...register("role")} type="radio" value="poster" className="peer sr-only" />
                    <div className="p-3 md:p-4 border border-outline-variant rounded-xl flex flex-col items-center gap-2 transition-all duration-200 peer-checked:border-primary peer-checked:bg-[#dae2ff]/30 group-hover:bg-surface-container-low">
                      <span className="material-symbols-outlined text-primary text-2xl">package_2</span>
                      <span className="text-sm font-bold text-on-surface">Poster</span>
                      <span className="text-xs text-on-surface-variant text-center leading-tight">I want to send items</span>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                  </label>

                  <label className="relative block cursor-pointer group">
                    <input {...register("role")} type="radio" value="driver" className="peer sr-only" />
                    <div className="p-3 md:p-4 border border-outline-variant rounded-xl flex flex-col items-center gap-2 transition-all duration-200 peer-checked:border-primary peer-checked:bg-[#dae2ff]/30 group-hover:bg-surface-container-low">
                      <span className="material-symbols-outlined text-primary text-2xl">local_shipping</span>
                      <span className="text-sm font-bold text-on-surface">Driver</span>
                      <span className="text-xs text-on-surface-variant text-center leading-tight">I want to deliver items</span>
                    </div>
                    <div className="absolute top-2 right-2 opacity-0 peer-checked:opacity-100 transition-opacity">
                      <span className="material-symbols-outlined text-primary text-base" style={{ fontVariationSettings: "'FILL' 1" }}>
                        check_circle
                      </span>
                    </div>
                  </label>

                </div>
                {errors.role && <p className="text-sm text-error-red">{errors.role.message}</p>}
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-sm font-medium text-on-surface block">
                  Full Name
                </label>
                <input
                  {...register("name")}
                  type="text"
                  id="full-name"
                  placeholder="John Doe"
                  className="w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white"
                />
                {errors.name && <p className="text-sm text-error-red mt-1">{errors.name.message}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-medium text-on-surface block">
                  Email Address
                </label>
                <input
                  {...register("email")}
                  type="email"
                  id="email"
                  placeholder="name@company.com"
                  className="w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white"
                />
                {errors.email && <p className="text-sm text-error-red mt-1">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-medium text-on-surface block">
                  Password
                </label>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={isPasswordVisible ? "text" : "password"}
                    id="password"
                    placeholder="••••••••"
                    className="w-full h-12 px-4 pr-12 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface p-1 transition-colors cursor-pointer"
                    aria-label="Toggle password visibility"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {isPasswordVisible ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
                {errors.password && <p className="text-sm text-error-red mt-1">{errors.password.message}</p>}
              </div>

              {/* Submit */}
              <div className="pt-2 space-y-4">
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className={submitButtonClassName}
                >
                  {getSubmitButtonContent(isSubmitting, isSuccess)}
                </button>

                <p className="text-center text-sm text-on-surface-variant">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary font-bold hover:underline">
                    Log in
                  </Link>
                </p>
              </div>

              <p className="text-xs text-on-surface-variant text-center opacity-70 pb-4">
                By signing up, you agree to SwiftShip's{" "}
                <Link href="#" className="underline">Terms</Link> and{" "}
                <Link href="#" className="underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="bg-surface-dim border-t border-outline-variant shrink-0">
        <div className="px-4 md:px-8 py-8 md:py-10 max-w-[1280px] mx-auto">

          {/* Brand row — mobile only */}
          <div className="mb-6 md:hidden">
            <span className="font-black text-on-surface text-lg block mb-1">SwiftShip</span>
            <p className="text-xs text-on-secondary-container">© 2024 SwiftShip Logistics Inc. All rights reserved.</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">

            {/* Brand col — desktop only */}
            <div className="hidden md:flex flex-col gap-3">
              <span className="font-black text-on-surface text-lg">SwiftShip</span>
              <p className="text-xs text-on-secondary-container">© 2024 SwiftShip Logistics Inc. All rights reserved.</p>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-on-surface">Company</h4>
              <Link href="#" className="text-sm text-on-secondary-container hover:text-primary transition-colors">Support Center</Link>
              <Link href="#" className="text-sm text-on-secondary-container hover:text-primary transition-colors">Driver Requirements</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-on-surface">Resources</h4>
              <Link href="#" className="text-sm text-on-secondary-container hover:text-primary transition-colors">Insurance Policy</Link>
              <Link href="#" className="text-sm text-on-secondary-container hover:text-primary transition-colors">Terms of Service</Link>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-sm font-bold text-on-surface">Connect</h4>
              <Link href="#" className="text-sm text-on-secondary-container hover:text-primary transition-colors">Privacy</Link>
              <div className="flex gap-4 mt-1">
                <span className="material-symbols-outlined text-on-secondary-container cursor-pointer hover:text-primary transition-colors">language</span>
                <span className="material-symbols-outlined text-on-secondary-container cursor-pointer hover:text-primary transition-colors">public</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
