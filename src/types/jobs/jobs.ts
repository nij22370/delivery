export interface JobLocationInput {
  pickupAddress: string;
  pickupContactName: string;
  pickupPhone: string;
  pickupInstructions?: string;
  dropoffAddress: string;
  dropoffContactName: string;
  dropoffPhone: string;
}

export interface JobVehicleInput {
  vehicleType: string;
}

export interface JobPricingInput {
  packageDescription?: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
}

export type CreateJobPayload = JobLocationInput & JobVehicleInput & JobPricingInput;

export interface Job {
  _id: string;
  posterId: string;
  driverId?: string;
  status: 'posted' | 'accepted' | 'in_transit' | 'delivered' | 'cancelled';
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: string;
  packageDescription?: string;
  offeredPrice: number;
  pickupDate: string;
  pickupTimeWindow: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobResponse {
  job: Job;
}

export interface GetJobsResponse {
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}

export interface MyJobsResponse {
  jobs: Array<Job & { driver?: { name?: string } | null }>;
  total: number;
  page: number;
  totalPages: number;
}
