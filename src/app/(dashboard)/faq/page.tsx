"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

interface FaqCategory {
  id: string;
  icon: string;
  label: string;
  items: FaqItem[];
}

const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "getting-started",
    icon: "rocket_launch",
    label: "Getting Started",
    items: [
      {
        id: "gs-1",
        question: "How do I create a driver account on SwiftShip?",
        answer:
          "Click 'Register' on the login page and select the 'Driver' role. Fill in your name, email, and password. After registering, you'll need to complete the verification process by uploading your license and vehicle documents before you can accept jobs.",
      },
      {
        id: "gs-2",
        question: "What documents do I need for driver verification?",
        answer:
          "You'll need a valid driving license, vehicle registration document, and an insurance certificate. Upload clear photos or scans of these documents under Settings → Verification. Our team reviews submissions within 1–2 business days.",
      },
      {
        id: "gs-3",
        question: "How do I post a delivery job as a business/poster?",
        answer:
          "Select 'Post Job' from the sidebar, fill in the pickup address, dropoff address, delivery date, time window, and your offered price in NPR. Once posted, verified drivers in the area can browse and accept your job.",
      },
      {
        id: "gs-4",
        question: "Can I use SwiftShip on my mobile phone?",
        answer:
          "Yes. SwiftShip is fully responsive and works on all modern mobile browsers. The bottom navigation bar is designed for easy thumb access on phones. A dedicated mobile app is planned for a future release.",
      },
    ],
  },
  {
    id: "payments-earnings",
    icon: "payments",
    label: "Payments & Earnings",
    items: [
      {
        id: "pe-1",
        question: "What payment gateways are supported?",
        answer:
          "SwiftShip supports eSewa and Khalti — the two most widely used digital payment gateways in Nepal. Bank transfers are also available for driver payouts. eSewa uses a form-POST redirect and Khalti uses a standard URL redirect flow.",
      },
      {
        id: "pe-2",
        question: "How much do drivers earn per delivery?",
        answer:
          "Drivers receive 90% of the job's offered price. SwiftShip retains a 10% platform fee. Your payout appears in the Earnings page under Pending Payouts until the admin processes the transfer — typically within 24 hours for eSewa/Khalti and 1–2 business days for bank transfers.",
      },
      {
        id: "pe-3",
        question: "Why does my payout show 'Pending' status?",
        answer:
          "Payouts are processed manually by the SwiftShip team for security verification. After a job is marked as delivered and the poster's payment is confirmed, your payout is queued. The status changes to 'Paid' once the transfer is initiated. If it's been more than 2 business days, contact support.",
      },
      {
        id: "pe-4",
        question: "What happens if a payment fails or I close the browser mid-payment?",
        answer:
          "No charges are made for failed or abandoned payments. The job stays in 'Unpaid' state and the poster can retry the payment from the job details page. SwiftShip verifies payment status server-side and never relies on redirect URL parameters alone.",
      },
      {
        id: "pe-5",
        question: "How do I update my bank or wallet details for payouts?",
        answer:
          "Go to the Earnings page and click 'Update Payment Details', or navigate to Settings → Wallet. Enter your eSewa/Khalti ID or bank account details. Ensure these are verified to avoid payout delays.",
      },
    ],
  },
  {
    id: "jobs-deliveries",
    icon: "local_shipping",
    label: "Jobs & Deliveries",
    items: [
      {
        id: "jd-1",
        question: "How does a driver accept a job?",
        answer:
          "Browse available jobs at Browse Jobs. Click on a job card to view full details including route, price, and pickup time window. Click 'Accept Job' — acceptance is atomic, so two drivers cannot accept the same job simultaneously.",
      },
      {
        id: "jd-2",
        question: "What are the delivery status stages?",
        answer:
          "Jobs go through four stages: Posted → Accepted → In Transit → Delivered. Drivers move jobs through the stages by pressing 'Start Delivery' and 'Mark as Delivered' on the Active Deliveries page. Cancelled is a terminal state for jobs that are withdrawn.",
      },
      {
        id: "jd-3",
        question: "Can a poster track where the driver is in real time?",
        answer:
          "Yes. Once a driver starts delivery, the poster can open the Tracking page which shows the driver's live GPS position on a map, a blue route polyline, and a dynamic ETA updated every 10 seconds. This is powered by Pusher real-time events.",
      },
      {
        id: "jd-4",
        question: "How do I chat with the driver or poster during a delivery?",
        answer:
          "On the job details page, click 'Open Chat'. This opens a dedicated real-time chat room for that job. Both poster and driver can exchange messages and attachments. Unread message counts appear as badges in the sidebar.",
      },
    ],
  },
  {
    id: "account-verification",
    icon: "verified_user",
    label: "Account & Verification",
    items: [
      {
        id: "av-1",
        question: "How long does driver verification take?",
        answer:
          "Verification submissions are reviewed by the SwiftShip admin team within 1–2 business days. You'll receive a status update visible on your Verification page. An approved profile is required before you can accept any delivery jobs.",
      },
      {
        id: "av-2",
        question: "My verification was rejected — what do I do?",
        answer:
          "The rejection will include a reason. Common reasons are: blurry document images, expired licenses, or mismatched names. Fix the issue and re-upload your documents on the Verification page. The team will re-review within 1–2 business days.",
      },
      {
        id: "av-3",
        question: "Can I have both a driver and poster account?",
        answer:
          "Each account has a single role (driver or poster) assigned at registration. To use both roles, you'd need two separate accounts with different email addresses. A dual-role feature is planned for a future update.",
      },
      {
        id: "av-4",
        question: "How do I reset my password?",
        answer:
          "Currently, password reset is handled by contacting support at sandeshd531@gmail.com with your registered email. An automated password-reset flow via email link is on the development roadmap.",
      },
    ],
  },
  {
    id: "technical",
    icon: "build",
    label: "Technical Issues",
    items: [
      {
        id: "tech-1",
        question: "The map isn't loading — what should I do?",
        answer:
          "The live tracking map uses OpenStreetMap tiles and the OSRM routing API. Try refreshing the page. If the map is still blank, check your internet connection and ensure your browser allows location access. Ad-blockers or strict privacy settings can sometimes block map tile requests.",
      },
      {
        id: "tech-2",
        question: "I'm not receiving real-time notifications for new messages.",
        answer:
          "SwiftShip uses Pusher for real-time events. Ensure you're on a stable internet connection. Try refreshing the page to re-establish the WebSocket connection. If the issue persists across sessions, contact support with your browser version and operating system.",
      },
      {
        id: "tech-3",
        question: "Why does my session expire so quickly?",
        answer:
          "SwiftShip uses short-lived access tokens (15 minutes) combined with a 7-day refresh token for security. If you see a 'Session expired' message, simply log in again. The refresh flow should handle most cases automatically in the background.",
      },
      {
        id: "tech-4",
        question: "I found a bug — how do I report it?",
        answer:
          "Please open a GitHub Issue at github.com/nij22370 with a description of the bug, steps to reproduce, and screenshots if possible. You can also contact us via email at sandeshd531@gmail.com with the subject line 'Bug Report'.",
      },
    ],
  },
];

function FaqItemAccordion({ item }: { item: FaqItem }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  return (
    <div className="border-b border-outline-variant last:border-0">
      <button
        type="button"
        id={`faq-${item.id}`}
        onClick={handleToggle}
        className="w-full flex items-start justify-between gap-4 px-5 py-4 text-left hover:bg-surface-container-low transition-colors cursor-pointer group"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
          {item.question}
        </span>
        <span
          className={`material-symbols-outlined text-xl text-on-surface-variant shrink-0 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="px-5 pb-4">
          <p className="text-sm text-secondary leading-relaxed">{item.answer}</p>
        </div>
      )}
    </div>
  );
}

export default function FaqPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setActiveCategory(null);
  }, []);

  const handleCategoryClick = useCallback((categoryId: string) => {
    setActiveCategory((prev) => (prev === categoryId ? null : categoryId));
    setSearchQuery("");
  }, []);

  const filteredCategories = useMemo<FaqCategory[]>(() => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (normalizedQuery) {
      return FAQ_CATEGORIES.map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(normalizedQuery) ||
            item.answer.toLowerCase().includes(normalizedQuery)
        ),
      })).filter((cat) => cat.items.length > 0);
    }

    if (activeCategory) {
      return FAQ_CATEGORIES.filter((cat) => cat.id === activeCategory);
    }

    return FAQ_CATEGORIES;
  }, [searchQuery, activeCategory]);

  const totalResults = useMemo(
    () => filteredCategories.reduce((sum, cat) => sum + cat.items.length, 0),
    [filteredCategories]
  );

  return (
    <div className="max-w-[1280px] mx-auto px-4 md:px-10 py-8 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-on-surface">Frequently Asked Questions</h1>
        <p className="text-sm text-secondary mt-1">
          Browse answers to common questions about SwiftShip.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-xl mb-6">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-xl select-none">
          search
        </span>
        <input
          id="faq-search"
          type="text"
          placeholder="Search questions..."
          value={searchQuery}
          onChange={handleSearchChange}
          className="w-full pl-12 pr-4 py-3 text-sm bg-surface-white border border-outline-variant rounded-xl text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors shadow-sm"
        />
        {searchQuery && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-secondary font-medium">
            {totalResults} result{totalResults !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Category Filter Chips */}
      {!searchQuery && (
        <div className="flex flex-wrap gap-2 mb-6">
          {FAQ_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleCategoryClick(cat.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-on-primary border-primary"
                  : "bg-surface-white text-secondary border-outline-variant hover:border-primary hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{cat.icon}</span>
              {cat.label}
            </button>
          ))}
          {activeCategory && (
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-xs font-semibold text-error-red border border-error-red/30 hover:bg-error-red/10 transition-all cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">close</span>
              Clear
            </button>
          )}
        </div>
      )}

      {/* FAQ Categories */}
      {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <span className="material-symbols-outlined text-5xl text-on-surface-variant/30">
            search_off
          </span>
          <p className="text-base font-semibold text-on-surface">No results found</p>
          <p className="text-sm text-secondary">
            Try a different search term or{" "}
            <Link href="/support" className="text-primary hover:underline font-semibold">
              contact support
            </Link>{" "}
            directly.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-surface-white border border-outline-variant rounded-xl shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-outline-variant bg-surface-container-low">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-lg text-primary">{cat.icon}</span>
                </div>
                <h2 className="text-sm font-bold text-on-surface">{cat.label}</h2>
                <span className="ml-auto text-xs text-secondary font-medium">
                  {cat.items.length} question{cat.items.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div>
                {cat.items.map((item) => (
                  <FaqItemAccordion key={item.id} item={item} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom CTA */}
      <div className="mt-10 bg-surface-container-low border border-outline-variant rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-on-surface">Still need help?</p>
          <p className="text-xs text-secondary mt-0.5">
            Our support team is available via email, phone, and LinkedIn.
          </p>
        </div>
        <Link
          href="/support"
          className="inline-flex items-center gap-2 px-5 h-10 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer shrink-0"
        >
          <span className="material-symbols-outlined text-base">contact_support</span>
          Contact Support
        </Link>
      </div>
    </div>
  );
}
