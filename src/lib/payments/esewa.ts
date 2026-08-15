import crypto from "crypto";
import type { IJob } from "@/models/Job";

const ESEWA_FORM_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form";

const ERROR_MSG_MISSING_SECRET = "ESEWA_SECRET_KEY is not defined in environment variables";
const ERROR_MSG_MISSING_MERCHANT_CODE = "ESEWA_MERCHANT_CODE is not defined in environment variables";
const ERROR_MSG_MISSING_SUCCESS_URL = "PAYMENT_SUCCESS_URL is not defined in environment variables";

interface EsewaInitResult {
  method: "form";
  url: string;
  params: Record<string, string>;
}

function getEsewaSecretKey(): string {
  const key = process.env.ESEWA_SECRET_KEY;
  if (!key) throw new Error(ERROR_MSG_MISSING_SECRET);
  return key;
}

function getEsewaMerchantCode(): string {
  const code = process.env.ESEWA_MERCHANT_CODE;
  if (!code) throw new Error(ERROR_MSG_MISSING_MERCHANT_CODE);
  return code;
}

function getPaymentSuccessUrl(): string {
  const url = process.env.PAYMENT_SUCCESS_URL;
  if (!url) throw new Error(ERROR_MSG_MISSING_SUCCESS_URL);
  return url;
}

function getPaymentFailureUrl(): string {
  return process.env.PAYMENT_FAILURE_URL || "/jobs";
}

export function generateEsewaSignature(
  totalAmount: string,
  transactionUuid: string,
  productCode: string
): string {
  const secretKey = getEsewaSecretKey();
  const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;
  
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  return hmac.digest("base64");
}

export async function initiateEsewa(
  job: IJob
): Promise<EsewaInitResult> {
  const merchantCode = getEsewaMerchantCode();
  const successUrl = getPaymentSuccessUrl();
  const failureUrl = getPaymentFailureUrl();
  
  const transactionUuid = crypto.randomUUID();
  const amount = job.offeredPrice.toString();
  const taxAmount = "0";
  const totalAmount = amount;
  const productServiceCharge = "0";
  const productDeliveryCharge = "0";
  const signedFieldNames = "total_amount,transaction_uuid,product_code";
  
  const signature = generateEsewaSignature(totalAmount, transactionUuid, merchantCode);
  
  job.paymentTransactionUuid = transactionUuid;
  job.paymentGateway = "esewa";
  job.paymentStatus = "initiated";
  await job.save();
  
  return {
    method: "form",
    url: ESEWA_FORM_URL,
    params: {
      amount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
      transaction_uuid: transactionUuid,
      product_code: merchantCode,
      product_service_charge: productServiceCharge,
      product_delivery_charge: productDeliveryCharge,
      success_url: successUrl,
      failure_url: failureUrl,
      signed_field_names: signedFieldNames,
      signature,
    },
  };
}

export function getEsewaPaymentFailureUrl(): string {
  return getPaymentFailureUrl();
}

export function verifyEsewaSignature(
  signedFieldNames: string,
  data: Record<string, string>,
  receivedSignature: string
): boolean {
  const fields = signedFieldNames.split(",");
  const parts: string[] = [];
  
  for (const field of fields) {
    const value = data[field];
    if (value === undefined) {
      return false;
    }
    parts.push(`${field}=${value}`);
  }
  
  const message = parts.join(",");
  const secretKey = getEsewaSecretKey();
  
  const hmac = crypto.createHmac("sha256", secretKey);
  hmac.update(message);
  const computedSignature = hmac.digest("base64");
  
  return computedSignature === receivedSignature;
}
