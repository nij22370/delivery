import type { IJob } from "@/models/Job";
import type { IUser } from "@/models/User";
import { initiateKhalti } from "./khalti";
import { initiateEsewa } from "./esewa";

export type PaymentGateway = "khalti" | "esewa";

export type PaymentInitResult =
  | { method: "redirect"; url: string; pidx?: string }
  | { method: "form"; url: string; params: Record<string, string> };

export async function initiatePayment(
  gateway: PaymentGateway,
  job: IJob,
  poster: IUser
): Promise<PaymentInitResult> {
  if (gateway === "khalti") {
    const result = await initiateKhalti(job, poster);
    return {
      method: result.method,
      url: result.url,
      pidx: result.pidx,
    };
  }

  if (gateway === "esewa") {
    return initiateEsewa(job);
  }

  throw new Error(`Unknown payment gateway: ${gateway}`);
}

export { initiateKhalti, initiateEsewa };
