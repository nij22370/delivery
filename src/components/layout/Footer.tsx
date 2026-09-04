import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-surface-dim border-t border-outline-variant shrink-0 w-full">
      <div className="px-4 md:px-8 py-8 md:py-10 max-w-[1280px] mx-auto w-full">
        {/* Brand row — mobile only */}
        <div className="mb-6 md:hidden">
          <span className="font-black text-on-surface text-lg block mb-1">
            SwiftShip
          </span>
          <p className="text-xs text-on-secondary-container">
            © 2026 SwiftShip. All rights reserved.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 w-full">
          {/* Brand col — desktop only */}
          <div className="hidden md:flex flex-col gap-3">
            <span className="font-black text-on-surface text-lg">
              SwiftShip
            </span>
            <p className="text-xs text-on-secondary-container">
              © 2026 SwiftShip. All rights reserved.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Platform</h4>
            <Link
              href="/register"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              For Posters
            </Link>
            <Link
              href="/register"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              For Drivers
            </Link>
            <Link
              href="/#how-it-works"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              How it Works
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Support</h4>
            <Link
              href="/faq"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              FAQ
            </Link>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Contact Support
            </Link>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Report an Issue
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Legal</h4>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
