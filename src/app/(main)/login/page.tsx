"use client";

import { useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { signIn } from "next-auth/react";
import { useLogin } from "@/api/hooks/auth/authApi";

const POST_LOGIN_REDIRECT = "/";

const HERO_IMAGE_URL = "/login.jpg";

const DECORATIVE_DOTS = [
  { isActive: true },
  { isActive: false },
  { isActive: false },
];

// ── Validation Schema ────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

// ── Helpers ──────────────────────────────────────────────────────────────────
function getSubmitButtonContent(
  isSubmitting: boolean,
  isSuccess: boolean
): React.ReactNode {
  if (isSubmitting) {
    return (
      <>
        <span className="material-symbols-outlined animate-spin text-xl">
          progress_activity
        </span>
        Signing in...
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
  return "Login";
}

// ── Component ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const handleTogglePasswordVisibility = useCallback(() => {
    setIsPasswordVisible((previous) => !previous);
  }, []);

  const onSubmit = useCallback(
    (data: LoginFormValues) => {
      setServerError(null);
      loginMutation.mutate(data, {
        onSuccess: () => {
          router.push(POST_LOGIN_REDIRECT);
        },
        onError: () => {
          // The hook handles the toast, we can clear this banner if we wanted, 
          // but we'll leave setServerError if needed, or just let toast do the work.
          setServerError("Login failed. Please try again.");
        }
      });
    },
    [loginMutation, router]
  );

  const handleGoogleSignIn = useCallback(() => {
    signIn("google", { callbackUrl: POST_LOGIN_REDIRECT });
  }, []);

  const submitButtonClassName = [
    "w-full h-12 rounded-lg text-sm font-bold transition-all duration-200",
    "flex items-center justify-center gap-2",
    "active:scale-[0.98] disabled:opacity-75 cursor-pointer",
    loginMutation.isSuccess
      ? "bg-success-green text-on-primary"
      : "bg-primary text-on-primary hover:bg-primary-container",
  ].join(" ");

  return (
    <div className="flex-1 flex flex-col md:flex-row w-full h-full text-on-surface bg-surface-white">

      {/* ── Left Panel — Hero (desktop only) ─────────────────── */}
      <section className="hidden md:flex md:w-1/2 relative overflow-hidden bg-primary">

        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <Image
            fill
            priority
            sizes="50vw"
            className="object-cover object-center"
            alt="A professional logistics courier standing next to a modern delivery van in a clean urban environment."
            src={HERO_IMAGE_URL}
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-primary/40 to-black/80" />
        </div>

        {/* Content pinned to bottom-left */}
        <div className="relative z-10 flex flex-col justify-end p-8 lg:p-12 w-full text-white">
          <span className="text-xl font-black tracking-tight mb-4 block">
            SwiftShip
          </span>
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight tracking-tight mb-4 max-w-sm">
            Welcome back to SwiftShip
          </h1>
          <p className="text-base text-white/80 max-w-sm leading-relaxed">
            Log in to manage your deliveries, track your live earnings, and
            optimize your courier routes with our precision mapping tools.
          </p>

          {/* Decorative progress dots */}
          <div className="mt-10 flex gap-3 items-center">
            {DECORATIVE_DOTS.map((dot, dotIndex) => (
              <div
                key={dotIndex}
                className={[
                  "h-1 rounded-full transition-all",
                  dot.isActive ? "w-10 bg-white" : "w-5 bg-white/30",
                ].join(" ")}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── Right Panel — Form ───────────────────────────────── */}
      <section className="w-full md:w-1/2 flex items-center justify-center bg-surface-white px-4 py-10 md:px-16 md:py-12">
        <div className="w-full max-w-md">

          {/* Mobile branding */}
          <div className="md:hidden mb-8">
            <span className="text-xl font-black text-primary tracking-tight">
              SwiftShip
            </span>
          </div>

          <header className="mb-8">
            {/* On desktop, the left panel carries the h1 — the form panel uses h2 semantically.
                On mobile (no left panel), this becomes the page's primary heading via aria-level. */}
            <h2 className="text-3xl font-semibold text-on-surface mb-2 leading-tight">
              Welcome Back
            </h2>
            <p className="text-base text-on-surface-variant">
              Enter your credentials to access your account
            </p>
          </header>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {serverError && (
              <div className="p-3 text-sm text-error-red bg-error-container border border-error-red/40 rounded-lg">
                {serverError}
              </div>
            )}

            {/* Email */}
            <div className="space-y-1.5">
              <label
                htmlFor="login-email"
                className="text-sm font-medium text-on-surface block"
              >
                Email address
              </label>
              <input
                {...register("email")}
                type="email"
                id="login-email"
                placeholder="name@company.com"
                className="w-full h-12 px-4 rounded-lg border border-outline-variant text-base focus:outline-none focus:border-2 focus:border-primary placeholder:text-on-surface-variant/50 transition-all bg-surface-white"
              />
              {errors.email && (
                <p className="text-sm text-error-red mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label
                  htmlFor="login-password"
                  className="text-sm font-medium text-on-surface block"
                >
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary font-medium hover:underline transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={isPasswordVisible ? "text" : "password"}
                  id="login-password"
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
              {errors.password && (
                <p className="text-sm text-error-red mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loginMutation.isPending || loginMutation.isSuccess}
              className={submitButtonClassName}
            >
              {getSubmitButtonContent(loginMutation.isPending, loginMutation.isSuccess)}
            </button>

            {/* Divider */}
            <div className="relative flex items-center py-1">
              <div className="flex-grow border-t border-outline-variant" />
              <span className="flex-shrink mx-4 text-xs font-semibold text-on-surface-variant uppercase tracking-widest">
                or continue with
              </span>
              <div className="flex-grow border-t border-outline-variant" />
            </div>

            {/* Google Sign-In */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              className="w-full h-12 bg-surface-white border border-outline-variant text-on-surface text-sm font-semibold rounded-lg hover:bg-surface-container-low active:scale-[0.98] transition-all flex items-center justify-center gap-3 cursor-pointer"
            >
              <GoogleIcon />
              Sign in with Google
            </button>
          </form>

          {/* Footer link */}
          <footer className="mt-8 text-center">
            <p className="text-sm text-on-surface-variant">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-primary font-bold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
