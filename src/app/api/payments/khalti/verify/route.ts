import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import PaymentTransaction from "@/models/PaymentTransaction";
import Payout from "@/models/Payout";
import { verifyKhaltiPayment, getPaymentFailureUrl } from "@/lib/payments/khalti";
import { notifyUser } from "@/lib/notify";
import { DRIVER_PAYOUT_RATE, PLATFORM_FEE_RATE } from "@/lib/constants";

const DUPLICATE_KEY_ERROR_CODE = 11000;

function redirectToSuccess(req: NextRequest, job: { _id: unknown; offeredPrice: number }): NextResponse {
  return NextResponse.redirect(
    new URL(
      `/payment/success?jobId=${job._id}&gateway=khalti&amount=${job.offeredPrice}&verified=true`,
      req.url
    )
  );
}

function redirectToFailure(req: NextRequest, jobId: string | undefined, reason: string): NextResponse {
  const targetJobId = jobId ?? "";
  const failureUrl = getPaymentFailureUrl(targetJobId);
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
    const pidx = searchParams.get("pidx");

    if (!pidx) {
      return NextResponse.json(
        { message: "Missing pidx parameter" },
        { status: 400 }
      );
    }

    const result = await verifyKhaltiPayment(pidx);

    const job = await Job.findOne({ paymentPidx: pidx });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }
    jobIdForFailure = job._id.toString();

    const status = result.status;

    if (status === "Completed") {
      // Step 1 — PaymentTransaction.create() FIRST (idempotency anchor).
      // The unique index on (gateway, transactionId) dedupes concurrent retries.
      let createdTransaction;
      try {
        createdTransaction = await PaymentTransaction.create({
          jobId: job._id,
          posterId: job.posterId,
          gateway: "khalti",
          transactionId: result.transaction_id,
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
        console.error("Khalti PaymentTransaction create failed:", transactionError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      if (!job.driverId) {
        return redirectToFailure(req, jobIdForFailure, "no_driver_assigned");
      }

      // Step 2 — Payout.create() second.
      try {
        const amount = job.offeredPrice * DRIVER_PAYOUT_RATE;
        const platformFee = job.offeredPrice * PLATFORM_FEE_RATE;
        await Payout.create({
          driverId: job.driverId,
          jobId: job._id,
          amount,
          platformFee,
          gateway: "khalti",
          gatewayTransactionId: result.transaction_id,
          status: "pending",
        });
      } catch (payoutError: unknown) {
        console.error("Khalti Payout create failed:", payoutError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      // Step 3 — job.paymentStatus update last.
      try {
        job.paymentStatus = "paid";
        await job.save();
      } catch (jobError: unknown) {
        console.error("Khalti job save failed:", jobError);
        return redirectToFailure(req, jobIdForFailure, "server_error");
      }

      const jobIdString = job._id.toString();
      void notifyUser(
        String(job.posterId),
        `Payment received for your delivery via Khalti.`,
        "success",
        { link: `/jobs/${jobIdString}` }
      );
      if (job.driverId) {
        const driverPayoutAmount = Math.round(job.offeredPrice * DRIVER_PAYOUT_RATE);
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

    if (status === "Pending") {
      return redirectToFailure(req, jobIdForFailure, "pending");
    }

    if (status === "Expired") {
      try {
        job.paymentStatus = "failed";
        await job.save();
        void notifyUser(
          String(job.posterId),
          `Your Khalti payment expired. Please retry to confirm your delivery.`,
          "error",
          { link: `/jobs/${jobIdForFailure}` }
        );
      } catch (jobError: unknown) {
        console.error("Khalti job save failed (Expired):", jobError);
      }
      return redirectToFailure(req, jobIdForFailure, "Expired");
    }

    if (status === "User canceled") {
      try {
        job.paymentStatus = "failed";
        await job.save();
        void notifyUser(
          String(job.posterId),
          `Your Khalti payment was cancelled. You can retry from the job page.`,
          "warning",
          { link: `/jobs/${jobIdForFailure}` }
        );
      } catch (jobError: unknown) {
        console.error("Khalti job save failed (User canceled):", jobError);
      }
      return redirectToFailure(req, jobIdForFailure, "User%20canceled");
    }

    if (status === "Refunded") {
      try {
        job.paymentStatus = "failed";
        await job.save();
        void notifyUser(
          String(job.posterId),
          `Your Khalti payment was refunded.`,
          "info",
          { link: `/jobs/${jobIdForFailure}` }
        );
      } catch (jobError: unknown) {
        console.error("Khalti job save failed (Refunded):", jobError);
      }
      return redirectToFailure(req, jobIdForFailure, "Refunded");
    }

    console.error(`Unknown Khalti payment status: ${status}`);
    return redirectToFailure(req, jobIdForFailure, "unknown");
  } catch (error: unknown) {
    console.error("Khalti verify fatal error:", error);
    return redirectToFailure(req, jobIdForFailure, "server_error");
  }
}
