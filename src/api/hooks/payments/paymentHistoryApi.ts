import { useQuery } from "@tanstack/react-query";
import {
  getPaymentHistory,
  getPaymentHistoryAggregate,
  type PaymentHistoryAggregateResponse,
} from "../../apis/payments/paymentHistoryApi";
import type { PaymentHistoryResponse } from "@/types/payments/paymentHistory";

export const PAYMENT_HISTORY_QUERY_KEY = "payment-history";

export interface UsePaymentHistoryParams {
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export function usePaymentHistory(params: UsePaymentHistoryParams = {}) {
  const { page = 1, limit = 20, enabled = true } = params;
  return useQuery<PaymentHistoryResponse>({
    queryKey: [PAYMENT_HISTORY_QUERY_KEY, page, limit],
    queryFn: () => getPaymentHistory({ page, limit }),
    enabled,
    retry: false,
  });
}

export const PAYMENT_HISTORY_AGGREGATE_QUERY_KEY = "payment-history-aggregate";

export function usePaymentHistoryAggregate(enabled: boolean = true) {
  return useQuery<PaymentHistoryAggregateResponse>({
    queryKey: [PAYMENT_HISTORY_AGGREGATE_QUERY_KEY],
    queryFn: getPaymentHistoryAggregate,
    enabled,
    retry: false,
  });
}
