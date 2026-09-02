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
  gateway: "khalti" | "esewa";
  transactionId: string;
  amount: number;
  status:
    | "Completed"
    | "Pending"
    | "Failed"
    | "Expired"
    | "User canceled"
    | "Refunded";
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
