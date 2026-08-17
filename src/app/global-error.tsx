"use client";

import { useEffect, useState, useCallback } from "react";

const ERROR_TITLE = "Critical Application Error";
const ERROR_DESCRIPTION =
  "A critical error occurred while rendering the application shell. Please refresh the page or contact support.";
const DEFAULT_ERROR_CODE = "ERR_SWIFT_GLOBAL_500";
const SUPPORT_HREF = "mailto:support@swiftship.com";

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    console.error("Global Error Boundary caught error:", error);
  }, [error]);

  const handleReset = useCallback(() => {
    setIsResetting(true);
    try {
      reset();
    } finally {
      setTimeout(() => {
        setIsResetting(false);
      }, 1000);
    }
  }, [reset]);

  const errorCode = error?.digest || DEFAULT_ERROR_CODE;

  return (
    <html lang="en" className="h-full">
      <head>
        <title>Application Error | SwiftShip</title>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-surface-white text-on-surface antialiased">
        <div className="max-w-md w-full flex flex-col items-center text-center">
          <div className="mb-6 p-6 rounded-full bg-error-container/30 text-error">
            <span
              className="material-symbols-outlined text-6xl"
              style={{ fontVariationSettings: "'wght' 200" }}
            >
              error_outline
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-on-surface mb-3">
            {ERROR_TITLE}
          </h1>
          <p className="text-sm sm:text-base text-outline mb-8 leading-relaxed">
            {ERROR_DESCRIPTION}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleReset}
              disabled={isResetting}
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 px-6 bg-primary text-on-primary font-semibold rounded-xl hover:bg-surface-tint active:scale-95 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-70"
            >
              <span
                className={`material-symbols-outlined text-lg ${
                  isResetting ? "animate-spin" : ""
                }`}
              >
                refresh
              </span>
              <span>{isResetting ? "Reloading..." : "Refresh Page"}</span>
            </button>
            <a
              href={SUPPORT_HREF}
              className="flex h-12 w-full sm:w-auto items-center justify-center gap-2 px-6 bg-surface-container-highest text-on-surface font-semibold rounded-xl hover:bg-secondary-container active:scale-95 transition-all border border-outline-variant cursor-pointer"
            >
              <span className="material-symbols-outlined text-lg">support_agent</span>
              <span>Contact Support</span>
            </a>
          </div>

          <div className="mt-8 p-3 border border-outline-variant rounded-lg bg-surface-container-lowest text-xs text-outline font-mono">
            Error Digest: {errorCode}
          </div>
        </div>
      </body>
    </html>
  );
}
