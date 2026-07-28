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
            © 2024 SwiftShip Logistics Inc. All rights reserved.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 w-full">
          {/* Brand col — desktop only */}
          <div className="hidden md:flex flex-col gap-3">
            <span className="font-black text-on-surface text-lg">
              SwiftShip
            </span>
            <p className="text-xs text-on-secondary-container">
              © 2024 SwiftShip Logistics Inc. All rights reserved.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Company</h4>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Support Center
            </Link>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Driver Requirements
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Resources</h4>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Insurance Policy
            </Link>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Terms of Service
            </Link>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="text-sm font-bold text-on-surface">Connect</h4>
            <Link
              href="#"
              className="text-sm text-on-secondary-container hover:text-primary transition-colors cursor-pointer"
            >
              Privacy
            </Link>
            <div className="flex gap-4 mt-1">
              <span className="material-symbols-outlined text-on-secondary-container cursor-pointer hover:text-primary transition-colors">
                language
              </span>
              <span className="material-symbols-outlined text-on-secondary-container cursor-pointer hover:text-primary transition-colors">
                public
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
