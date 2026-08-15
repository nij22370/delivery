import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import connectDB from "@/lib/db";
import Job from "@/models/Job";
import PaymentTransaction from "@/models/PaymentTransaction";
import Payout from "@/models/Payout";
import { verifyEsewaSignature, getEsewaPaymentFailureUrl } from "@/lib/payments/esewa";

const DRIVER_PAYOUT_PERCENTAGE = 0.9;
const PLATFORM_FEE_PERCENTAGE = 0.1;

interface EsewaDecodedData {
  transaction_uuid: string;
  total_amount: string;
  transaction_code: string;
  status: string;
  signed_field_names: string;
  signature: string;
}

export async function GET(req: NextRequest) {
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
      const failureUrl = getEsewaPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=invalid_data`);
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
      const failureUrl = getEsewaPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=invalid_signature`);
    }

    const job = await Job.findOne({ paymentTransactionUuid: transaction_uuid });
    if (!job) {
      return NextResponse.json({ message: "Job not found" }, { status: 404 });
    }

    if (status === "COMPLETE") {
      const existingTransaction = await PaymentTransaction.findOne({
        gateway: "esewa",
        transactionId: transaction_code,
      });

      if (existingTransaction) {
        return redirect(`/jobs/${job._id}`);
      }

      if (!job.driverId) {
        const failureUrl = getEsewaPaymentFailureUrl();
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
        gateway: "esewa",
        gatewayTransactionId: transaction_code,
        status: "pending",
      });

      await PaymentTransaction.create({
        jobId: job._id,
        gateway: "esewa",
        transactionId: transaction_code,
        amount: job.offeredPrice,
        status: "Completed",
        processedAt: new Date(),
      });

      return redirect(`/jobs/${job._id}`);
    }

    if (status === "FAILED" || status === "AMBIGUOUS") {
      job.paymentStatus = "failed";
      await job.save();
      const failureUrl = getEsewaPaymentFailureUrl();
      return redirect(`${failureUrl}?reason=${status}`);
    }

    console.error(`Unknown eSewa payment status: ${status}`);
    const failureUrl = getEsewaPaymentFailureUrl();
    return redirect(`${failureUrl}?reason=unknown`);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to verify payment";
    return NextResponse.json({ message }, { status: 500 });
  }
}
