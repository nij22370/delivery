import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import PaymentTransaction from "@/models/PaymentTransaction";
import Payout from "@/models/Payout";
import { verifyEsewaSignature, getEsewaPaymentFailureUrl } from "@/lib/payments/esewa";
import { notifyUser } from "@/lib/notify";

const DRIVER_PAYOUT_PERCENTAGE = 0.9;
const PLATFORM_FEE_PERCENTAGE = 0.1;
const DUPLICATE_KEY_ERROR_CODE = 11000;

interface EsewaDecodedData {
  transaction_uuid: string;
  total_amount: string;
  transaction_code: string;
  status: string;
  signed_field_names: string;
  signature: string;
}

function redirectToSuccess(req: NextRequest, job: { _id: unknown; offeredPrice: number }): NextResponse {
  return NextResponse.redirect(
    new URL(
      `/payment/success?jobId=${job._id}&gateway=esewa&amount=${job.offeredPrice}&verified=true`,
      req.url
    )
  );
}

function redirectToFailure(req: NextRequest, jobId: string | undefined, reason: string): NextResponse {
  const targetJobId = jobId ?? "";
  const failureUrl = getEsewaPaymentFailureUrl(targetJobId);
  const separator = failureUrl.includes("?") ? "&" : "?";
  return NextResponse.redirect(
    new URL(`${failureUrl}${separator}reason=${reason}`, req.url)
  );
}

export async function GET(req: NextRequest) {
  let jobIdForFailure: string | undefined;
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const dataParam = searchParams.get("data");

    if (!dataParam) {
      return NextResponse.json(
        { message: "Missing data parameter" },
        { status: 400 }
      );
    }

    let decoded: EsewaDecodedData;
    try {
      const decodedString = Buffer.from(dataParam, "base64").toString("utf-8");
      decoded = JSON.parse(decodedString);
    } catch {
      return redirectToFailure(req, undefined, "invalid_data");
    }

    const {
      transaction_uuid,
      total_amount,
      transaction_code,
      status,
      signed_field_names,
      signature,
    } = decoded;

    const dataForSignature: Record<string, string> = {
      transaction_uuid,
      total_amount,
      transaction_code,
      status,
      signed_field_names,
      signature,
    };

    const isSignatureValid = verifyEsewaSignature(
      signed_field_names,
      dataForSignature,
      signature
    );

    if (!isSignatureValid) {
      return redirectToFailure(req, undefined, "invalid_signature");
    }

    const job = await Job.findOne({ paymentTransactionUuid: transaction_uuid });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }
    jobIdForFailure = job._id.toString();

    if (status === "COMPLETE") {
      // Step 1 — PaymentTransaction.create() FIRST (idempotency anchor).
      let createdTransaction;
      try {
        createdTransaction = await PaymentTransaction.create({
          jobId: job._id,
          posterId: job.posterId,
          gateway: "esewa",
          transactionId: transaction_code,
          amount: job.offeredPrice,
          status: "Completed",
          processedAt: new Date(),
        });
      } catch (transactionError: unknown) {
        const isDuplicate =
          typeof transactionError === "object" &&
          transactionError !== null &&
          "code" in transactionError &&
          (transactionError as { code?: number }).code === DUPLICATE_KEY_ERROR_CODE;
        if (isDuplicate) {
          return redirectToSuccess(req, job);
        }
        console.error("eSewa PaymentTransaction create failed:", transactionError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      if (!job.driverId) {
        return redirectToFailure(req, jobIdForFailure, "no_driver_assigned");
      }

      // Step 2 — Payout.create() second.
      try {
        const amount = job.offeredPrice * DRIVER_PAYOUT_PERCENTAGE;
        const platformFee = job.offeredPrice * PLATFORM_FEE_PERCENTAGE;
        await Payout.create({
          driverId: job.driverId,
          jobId: job._id,
          amount,
          platformFee,
          gateway: "esewa",
          gatewayTransactionId: transaction_code,
          status: "pending",
        });
      } catch (payoutError: unknown) {
        console.error("eSewa Payout create failed:", payoutError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      // Step 3 — job.paymentStatus update last.
      try {
        job.paymentStatus = "paid";
        await job.save();
      } catch (jobError: unknown) {
        console.error("eSewa job save failed:", jobError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      const jobIdString = job._id.toString();
      void notifyUser(
        String(job.posterId),
        `Payment received for your delivery via eSewa.`,
        "success",
        { link: `/jobs/${jobIdString}` }
      );
      if (job.driverId) {
        const driverPayoutAmount = Math.round(job.offeredPrice * DRIVER_PAYOUT_PERCENTAGE);
        void notifyUser(
          String(job.driverId),
          `A payout of NPR ${driverPayoutAmount} has been initiated for you.`,
          "info",
          { link: "/driver/payouts" }
        );
      }

      void createdTransaction;
      return redirectToSuccess(req, job);
    }

    if (status === "FAILED" || status === "AMBIGUOUS") {
      try {
        job.paymentStatus = "failed";
        await job.save();
        void notifyUser(
          String(job.posterId),
          status === "FAILED"
            ? `Your eSewa payment failed. Please retry to confirm your delivery.`
            : `Your eSewa payment is in an ambiguous state. Please retry to confirm your delivery.`,
          "error",
          { link: `/jobs/${jobIdForFailure}` }
        );
      } catch (jobError: unknown) {
        console.error("eSewa job save failed (FAILED/AMBIGUOUS):", jobError);
      }
      return redirectToFailure(req, jobIdForFailure, status);
    }

    console.error(`Unknown eSewa payment status: ${status}`);
    return redirectToFailure(req, jobIdForFailure, "unknown");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    console.error("eSewa verify fatal error:", message);
    return redirectToFailure(req, jobIdForFailure, "server_error");
  }
}
