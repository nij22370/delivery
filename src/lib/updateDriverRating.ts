import { Types } from "mongoose";
import Rating from "@/models/Rating";
import User from "@/models/User";
import DriverProfile from "@/models/DriverProfile";

const DRIVER_ROLE = "driver";
const RATING_DECIMAL_FACTOR = 10;

interface RatingAggregateResult {
  avg: number;
  count: number;
}

export async function updateDriverRating(toUserId: string): Promise<void> {
  const user = await User.findById(toUserId).select("role").lean();
  if (!user || user.role !== DRIVER_ROLE) return;

  const result = await Rating.aggregate<RatingAggregateResult>([
    { $match: { toUserId: new Types.ObjectId(toUserId) } },
    {
      $group: {
        _id: null,
        avg: { $avg: "$score" },
        count: { $sum: 1 },
      },
    },
  ]);

  const avg = result.length > 0 ? Math.round(result[0].avg * RATING_DECIMAL_FACTOR) / RATING_DECIMAL_FACTOR : 0;
  const count = result.length > 0 ? result[0].count : 0;

  await DriverProfile.findOneAndUpdate(
    { userId: toUserId },
    { $set: { ratingAvg: avg, ratingCount: count } }
  );
}
