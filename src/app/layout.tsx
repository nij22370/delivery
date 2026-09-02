import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SwiftShip | Delivery Network",
  description:
    "SwiftShip is a high-performance delivery platform connecting posters and drivers with real-time tracking, secure payments, and a verified fleet.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: {
    title: "SwiftShip | Delivery Network",
    description:
      "SwiftShip is a high-performance delivery platform connecting posters and drivers with real-time tracking, secure payments, and a verified fleet.",
    url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
    siteName: "SwiftShip",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "SwiftShip — Delivery Network",
      },
    ],
    locale: "en_US",
    type: "website",
  },
};

import AuthProvider from "@/components/providers/AuthProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import PusherProvider from "@/components/providers/PusherProvider";
import ThemeInitializer from "@/components/providers/ThemeInitializer";
import { Toaster } from "sonner";

const FLASH_THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('swiftship-theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <style>{`
          .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
        `}</style>
      </head>
      <body className="min-h-full flex flex-col bg-surface-white text-on-surface" suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: FLASH_THEME_SCRIPT }} />
        <ThemeInitializer />
        <AuthProvider>
          <QueryProvider>
            <PusherProvider>
              <main className="flex-1 flex flex-col w-full h-full">
                {children}
              </main>
            </PusherProvider>
          </QueryProvider>
        </AuthProvider>
        <Toaster />
      </body>
    </html>
  );
}
