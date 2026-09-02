import api from "../../api";
import type { PaymentHistoryResponse } from "@/types/payments/paymentHistory";

const PAYMENT_HISTORY_ENDPOINT = "/payments/history";

export interface PaymentHistoryAggregateResponse {
  totalAmount: number;
  total: number;
}

export interface FetchPaymentHistoryParams {
  page?: number;
  limit?: number;
  aggregate?: boolean;
}

export async function getPaymentHistory(
  params: FetchPaymentHistoryParams = {}
): Promise<PaymentHistoryResponse> {
  const response = await api.get<PaymentHistoryResponse>(PAYMENT_HISTORY_ENDPOINT, {
    params,
  });
  return response.data;
}

export async function getPaymentHistoryAggregate(): Promise<PaymentHistoryAggregateResponse> {
  const response = await api.get<PaymentHistoryAggregateResponse>(
    PAYMENT_HISTORY_ENDPOINT,
    { params: { aggregate: "true" } }
  );
  return response.data;
}
