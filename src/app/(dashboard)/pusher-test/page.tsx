"use client";

import { useCallback, useEffect, useState } from "react";

const TEST_CHANNEL = "test-channel";
const TEST_EVENT = "test-event";
const TEST_API_ENDPOINT = "/api/test-pusher";

interface TestMessage {
  timestamp: string;
  message: string;
}

export default function PusherTestPage() {
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    let isMounted = true;

    import("@/lib/pusherClient").then(({ pusherClient }) => {
      const channel = pusherClient.subscribe(TEST_CHANNEL);

      channel.bind(TEST_EVENT, (data: TestMessage) => {
        if (isMounted) {
          setMessages((previous) => [...previous, data]);
        }
      });

      return () => {
        if (isMounted) {
          channel.unbind_all();
          pusherClient.unsubscribe(TEST_CHANNEL);
        }
      };
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSendTestEvent = useCallback(async () => {
    setIsSending(true);
    try {
      await fetch(TEST_API_ENDPOINT, { method: "POST" });
    } finally {
      setIsSending(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-surface-container-low p-8">
      <h1 className="text-2xl font-bold text-on-surface mb-4">
        Pusher Test Page
      </h1>

      <button
        type="button"
        onClick={handleSendTestEvent}
        disabled={isSending}
        className="h-12 px-6 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
      >
        {isSending ? "Sending..." : "Send Test Event"}
      </button>

      <div className="mt-6">
        <h2 className="text-sm font-semibold text-on-surface-variant mb-2">
          Received Messages ({messages.length})
        </h2>
        <ul className="space-y-2">
          {messages.map((msg, index) => (
            <li
              key={`${msg.timestamp}-${index}`}
              className="p-3 bg-surface-white border border-outline-variant rounded-lg text-sm text-on-surface"
            >
              <span className="font-mono text-on-surface-variant">
                {msg.timestamp}
              </span>
              {" — "}
              {msg.message}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
