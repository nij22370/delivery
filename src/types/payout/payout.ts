export type PayoutGateway = "khalti" | "esewa";
export type PayoutStatus = "pending" | "paid" | "failed";

export interface PopulatedPayoutJob {
  _id: string;
  pickupAddress: string;
  dropoffAddress: string;
  offeredPrice: number;
  status: string;
}

export interface DriverPayoutItem {
  _id: string;
  jobId: PopulatedPayoutJob | string;
  amount: number;
  platformFee: number;
  gateway: PayoutGateway;
  gatewayTransactionId: string;
  status: PayoutStatus;
  paidAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetDriverPayoutsResponse {
  payouts: DriverPayoutItem[];
  totalEarned: number;
  pendingPayout: number;
}
