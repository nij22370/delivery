import { NextRequest, NextResponse } from "next/server";
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
        return NextResponse.redirect(
          new URL(
            `/payment/success?jobId=${job._id}&gateway=khalti&amount=${job.offeredPrice}&verified=true`,
            req.url
          )
        );
      }

      if (!job.driverId) {
        const failureUrl = getPaymentFailureUrl(job._id.toString());
        const separator = failureUrl.includes("?") ? "&" : "?";
        return NextResponse.redirect(
          new URL(`${failureUrl}${separator}reason=no_driver_assigned`, req.url)
        );
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

      return NextResponse.redirect(
        new URL(
          `/payment/success?jobId=${job._id}&gateway=khalti&amount=${job.offeredPrice}&verified=true`,
          req.url
        )
      );
    }

    const failureUrl = getPaymentFailureUrl(job?._id?.toString());
    const separator = failureUrl.includes("?") ? "&" : "?";

    if (status === "Pending") {
      return NextResponse.redirect(
        new URL(`${failureUrl}${separator}reason=pending`, req.url)
      );
    }

    if (status === "Expired") {
      job.paymentStatus = "failed";
      await job.save();
      return NextResponse.redirect(
        new URL(`${failureUrl}${separator}reason=Expired`, req.url)
      );
    }

    if (status === "User canceled") {
      job.paymentStatus = "failed";
      await job.save();
      return NextResponse.redirect(
        new URL(`${failureUrl}${separator}reason=User%20canceled`, req.url)
      );
    }

    if (status === "Refunded") {
      job.paymentStatus = "failed";
      await job.save();
      return NextResponse.redirect(
        new URL(`${failureUrl}${separator}reason=Refunded`, req.url)
      );
    }

    console.error(`Unknown Khalti payment status: ${status}`);
    return NextResponse.redirect(
      new URL(`${failureUrl}${separator}reason=unknown`, req.url)
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    return NextResponse.json({ message }, { status: 500 });
  }
}
