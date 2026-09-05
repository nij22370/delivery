export type PaymentGateway = "khalti" | "esewa";
export type TransactionStatus =
  | "Completed"
  | "Pending"
  | "Failed"
  | "Expired"
  | "User canceled"
  | "Refunded";

export interface PopulatedJobOnTransaction {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  offeredPrice: number;
  paymentStatus?: string;
  paymentGateway?: string;
}

export interface PaymentTransactionItem {
  _id: string;
  jobId: string | PopulatedJobOnTransaction;
  posterId?: string | null;
  gateway: PaymentGateway;
  transactionId: string;
  amount: number;
  status: TransactionStatus;
  processedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PaymentHistoryResponse {
  transactions: PaymentTransactionItem[];
  total: number;
  page: number;
  totalPages: number;
}
