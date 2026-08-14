import type { IJob } from "@/models/Job";
import type { IUser } from "@/models/User";

const KHALTI_INITIATE_URL = "https://a.khalti.com/api/v2/epayment/initiate/";
const KHALTI_LOOKUP_URL = "https://a.khalti.com/api/v2/epayment/lookup/";
const WEBSITE_URL = "http://localhost:3000";
const PAISA_MULTIPLIER = 100;

const ERROR_MSG_MISSING_SECRET = "KHALTI_SECRET_KEY is not defined in environment variables";
const ERROR_MSG_MISSING_SUCCESS_URL = "PAYMENT_SUCCESS_URL is not defined in environment variables";

interface KhaltiInitiateResponse {
  pidx: string;
  payment_url: string;
  expires_at: string;
  payment_url_expires_at: string;
}

interface KhaltiLookupResponse {
  pidx: string;
  total_amount: number;
  status: string;
  transaction_id: string;
  fee: number;
  refunded: boolean;
}

function getKhaltiSecretKey(): string {
  const key = process.env.KHALTI_SECRET_KEY;
  if (!key) throw new Error(ERROR_MSG_MISSING_SECRET);
  return key;
}

function getPaymentSuccessUrl(): string {
  const url = process.env.PAYMENT_SUCCESS_URL;
  if (!url) throw new Error(ERROR_MSG_MISSING_SUCCESS_URL);
  return url;
}

function getFailureUrl(): string {
  return process.env.PAYMENT_FAILURE_URL || "/jobs";
}

export async function initiateKhalti(
  job: IJob,
  poster: IUser
): Promise<{
  method: "redirect";
  url: string;
  pidx: string;
}> {
  const secretKey = getKhaltiSecretKey();
  const returnUrl = getPaymentSuccessUrl();

  const response = await fetch(KHALTI_INITIATE_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      return_url: returnUrl,
      website_url: WEBSITE_URL,
      amount: job.offeredPrice * PAISA_MULTIPLIER,
      purchase_order_id: job._id.toString(),
      purchase_order_name: `SwiftShip Delivery Job ${job._id}`,
      customer_info: {
        name: poster.name,
        email: poster.email,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Khalti initiation failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as KhaltiInitiateResponse;

  return {
    method: "redirect",
    url: data.payment_url,
    pidx: data.pidx,
  };
}

export async function verifyKhaltiPayment(
  pidx: string
): Promise<KhaltiLookupResponse> {
  const secretKey = getKhaltiSecretKey();

  const response = await fetch(KHALTI_LOOKUP_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ pidx }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Khalti lookup failed: ${response.status} - ${errorText}`);
  }

  return (await response.json()) as KhaltiLookupResponse;
}

export function getPaymentFailureUrl(): string {
  return getFailureUrl();
}
