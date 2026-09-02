export interface PublicProfileUser {
  _id: string;
  name: string;
  email: string;
  role: "poster" | "driver" | "admin";
  profilePhotoUrl: string | null;
  createdAt: string;
}

export interface PublicProfileResponse {
  user: PublicProfileUser;
  totalJobsPosted: number;
  averageRatingGiven: number;
}
