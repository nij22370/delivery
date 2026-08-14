import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import PaymentTransaction from "@/models/PaymentTransaction";
import Payout from "@/models/Payout";
import { verifyKhaltiPayment, getPaymentFailureUrl } from "@/lib/payments/khalti";

const DRIVER_PAYOUT_PERCENTAGE = 0.9;
const PLATFORM_FEE_PERCENTAGE = 0.1;

export async function GET(req: NextRequest) {
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

    const status = result.status;

    if (status === "Completed") {
      const existingTransaction = await PaymentTransaction.findOne({
        gateway: "khalti",
        transactionId: result.transaction_id,
      });

      if (existingTransaction) {
        return redirect(`/jobs/${job._id}`);
      }

      if (!job.driverId) {
        const failureUrl = getPaymentFailureUrl();
        return redirect(`${failureUrl}?reason=no_driver_assigned`);
      }

      job.paymentStatus = "paid";
      await job.save();

      const amount = job.offeredPrice * DRIVER_PAYOUT_PERCENTAGE;
      const platformFee = job.offeredPrice * PLATFORM_FEE_PERCENTAGE;

      await Payout.create({
        driverId: job.driverId,
        jobId: job._id,
        amount,
        platformFee,
        gateway: "khalti",
        gatewayTransactionId: result.transaction_id,
        status: "pending",
      });

      await PaymentTransaction.create({
        jobId: job._id,
        gateway: "khalti",
        transactionId: result.transaction_id,
        amount: job.offeredPrice,
        status: "Completed",
        processedAt: new Date(),
      });

      return redirect(`/jobs/${job._id}`);
    }

    if (status === "Pending") {
      const failureUrl = getPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=pending`);
    }

    if (status === "Expired") {
      job.paymentStatus = "failed";
      await job.save();
      const failureUrl = getPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=Expired`);
    }

    if (status === "User canceled") {
      job.paymentStatus = "failed";
      await job.save();
      const failureUrl = getPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=User%20canceled`);
    }

    if (status === "Refunded") {
      job.paymentStatus = "failed";
      await job.save();
      const failureUrl = getPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=Refunded`);
    }

    console.error(`Unknown Khalti payment status: ${status}`);
    const failureUrl = getPaymentFailureUrl();
    return redirect(`${failureUrl}?reason=unknown`);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    return NextResponse.json({ message }, { status: 500 });
  }
}
