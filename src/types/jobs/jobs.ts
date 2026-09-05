import type { JobStatus, JobLocationInput, JobVehicleInput, JobPricingInput } from "../job";
export type { JobLocationInput, JobVehicleInput, JobPricingInput };

export type CreateJobPayload = JobLocationInput & JobVehicleInput & JobPricingInput;

export interface Job {
  _id: string;
  posterId: string;
  driverId?: string | { _id: string; name: string } | null;
  status: JobStatus;
  pickupAddress: string;
  dropoffAddress: string;
  vehicleType: string;
  packageDescription?: string;
  disputeReason?: string;
  flaggedBy?: string;
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
  jobs: Job[];
  total: number;
  page: number;
  totalPages: number;
}
