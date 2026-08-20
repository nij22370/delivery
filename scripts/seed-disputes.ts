import { existsSync } from "node:fs";
import mongoose from "mongoose";
import Job from "../src/models/Job";
import Message from "../src/models/Message";
import User from "../src/models/User";
import { JOB_STATUS } from "../src/types/job";

const SEED_POSTER_EMAIL = "dispute.poster@example.com";
const SEED_DRIVER_EMAIL = "dispute.driver@example.com";
const POSTER_ROLE = "poster";
const DRIVER_ROLE = "driver";
const JOB_VEHICLE_BICYCLE = "bicycle";

interface DisputeSpec {
  status: "accepted" | "in_transit" | "delivered";
  reason: string;
  flaggedBy: "poster" | "driver";
  daysAgo: number;
  price: number;
  evidenceImages: string[];
  messages: { sender: "poster" | "driver"; content: string; minutesOffset: number }[];
}

const DISPUTE_SPECS: DisputeSpec[] = [
  {
    status: "accepted",
    reason: "Driver has not responded for 2 hours after accepting.",
    flaggedBy: "poster",
    daysAgo: 1,
    price: 1500,
    evidenceImages: [
      "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      "https://res.cloudinary.com/demo/image/upload/sample1.jpg",
    ],
    messages: [
      { sender: "driver", content: "I'll be there in 10 minutes.", minutesOffset: -120 },
      { sender: "poster", content: "Okay, waiting.", minutesOffset: -115 },
      { sender: "driver", content: "Sorry for the delay, traffic is heavy.", minutesOffset: -30 },
      { sender: "poster", content: "Please hurry, it's urgent.", minutesOffset: -25 },
    ],
  },
  {
    status: "in_transit",
    reason: "Package was damaged during transit, requesting refund.",
    flaggedBy: "driver",
    daysAgo: 2,
    price: 2200,
    evidenceImages: [
      "https://res.cloudinary.com/demo/image/upload/sample2.jpg",
    ],
    messages: [
      { sender: "driver", content: "Package looks torn at the bottom.", minutesOffset: -60 },
      { sender: "poster", content: "It was fine when I handed it over.", minutesOffset: -55 },
      { sender: "driver", content: "I have a photo of the damage.", minutesOffset: -50 },
    ],
  },
  {
    status: "delivered",
    reason: "Receiver says package never arrived, GPS shows delivery at wrong address.",
    flaggedBy: "poster",
    daysAgo: 3,
    price: 3400,
    evidenceImages: [
      "https://res.cloudinary.com/demo/image/upload/sample3.jpg",
      "https://res.cloudinary.com/demo/image/upload/sample4.jpg",
      "https://res.cloudinary.com/demo/image/upload/sample5.jpg",
    ],
    messages: [
      { sender: "poster", content: "Did you deliver to the correct address?", minutesOffset: -90 },
      { sender: "driver", content: "Yes, I left it at the door.", minutesOffset: -85 },
      { sender: "poster", content: "The receiver says they never got it.", minutesOffset: -80 },
      { sender: "driver", content: "I have a photo of the delivered package.", minutesOffset: -75 },
      { sender: "poster", content: "GPS shows you were at a different location.", minutesOffset: -70 },
    ],
  },
  {
    status: "accepted",
    reason: "Driver asked for extra payment beyond agreed fare.",
    flaggedBy: "poster",
    daysAgo: 4,
    price: 1800,
    evidenceImages: [],
    messages: [
      { sender: "driver", content: "The fare is too low, I need extra 500.", minutesOffset: -45 },
      { sender: "poster", content: "No, we agreed on the price already.", minutesOffset: -40 },
    ],
  },
  {
    status: "in_transit",
    reason: "Driver stopped responding and location tracking is stuck.",
    flaggedBy: "driver",
    daysAgo: 5,
    price: 2700,
    evidenceImages: [
      "https://res.cloudinary.com/demo/image/upload/sample6.jpg",
    ],
    messages: [
      { sender: "poster", content: "Where are you? Tracking hasn't moved.", minutesOffset: -180 },
      { sender: "driver", content: "Phone died, charging now.", minutesOffset: -170 },
      { sender: "poster", content: "You didn't reply for 3 hours.", minutesOffset: -60 },
    ],
  },
];

function daysAgoUtc(days: number, hour = 12): Date {
  const date = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  date.setUTCHours(hour, 0, 0, 0);
  return date;
}

async function main(): Promise<void> {
  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local");
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI is not set. Provide a .env.local file or set the env var.");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  try {
    const existingUsers = await User.find({
      email: { $in: [SEED_POSTER_EMAIL, SEED_DRIVER_EMAIL] },
    }).select("_id").lean();
    const existingUserIds = existingUsers.map((user) => user._id);
    if (existingUserIds.length > 0) {
      const existingJobIds = await Job.find({ posterId: { $in: existingUserIds } }).distinct("_id");
      await Message.deleteMany({ jobId: { $in: existingJobIds } });
      await Job.deleteMany({ posterId: { $in: existingUserIds } });
      await User.deleteMany({ _id: { $in: existingUserIds } });
    }

    const poster = await User.create({
      name: "Dispute Seed Poster",
      email: SEED_POSTER_EMAIL,
      role: POSTER_ROLE,
    });

    const driver = await User.create({
      name: "Dispute Seed Driver",
      email: SEED_DRIVER_EMAIL,
      role: DRIVER_ROLE,
    });

    const seededJobs = [];

    for (const spec of DISPUTE_SPECS) {
      const createdAt = daysAgoUtc(spec.daysAgo);
      const acceptedAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
      const inTransitAt = new Date(acceptedAt.getTime() + 2 * 60 * 60 * 1000);
      const deliveredAt = spec.status === "delivered" ? new Date(inTransitAt.getTime() + 3 * 60 * 60 * 1000) : undefined;
      const disputedAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000);

      const job = await Job.create({
        posterId: poster._id,
        driverId: driver._id,
        status: JOB_STATUS.DISPUTED,
        disputeReason: spec.reason,
        flaggedBy: spec.flaggedBy,
        pickupAddress: `Seed Pickup ${spec.daysAgo}d`,
        pickupContactName: "Seed Pickup Contact",
        pickupPhone: "9800000000",
        dropoffAddress: `Seed Dropoff ${spec.daysAgo}d`,
        dropoffContactName: "Seed Dropoff Contact",
        dropoffPhone: "9800000001",
        vehicleType: JOB_VEHICLE_BICYCLE,
        offeredPrice: spec.price,
        pickupDate: "2026-01-01",
        pickupTimeWindow: "10:00-12:00",
        evidenceImages: spec.evidenceImages,
        acceptedAt,
        inTransitAt,
        deliveredAt,
        disputedAt,
        createdAt,
        updatedAt: disputedAt,
      });

      for (const msg of spec.messages) {
        const senderId = msg.sender === "poster" ? poster._id : driver._id;
        const recipientId = msg.sender === "poster" ? driver._id : poster._id;
        const msgDate = new Date(disputedAt.getTime() + msg.minutesOffset * 60 * 1000);
        
        await Message.create({
          jobId: job._id,
          senderId,
          recipientId,
          content: msg.content,
          createdAt: msgDate,
        });
      }

      const evidenceCount = (job.evidenceImages?.length ?? 0);
      const messageCount = spec.messages.length;

      seededJobs.push({
        jobCode: `#SWF-${job._id.toString().slice(-4).toUpperCase()}`,
        status: job.status,
        flaggedBy: job.flaggedBy,
        reason: job.disputeReason,
        price: job.offeredPrice,
        evidenceCount,
        messageCount,
      });
    }

    console.log("\n=== Seeded Disputes ===");
    for (const item of seededJobs) {
      console.log(`- ${item.jobCode} | ${item.status} | flaggedBy=${item.flaggedBy} | NPR ${item.price} | evidence=${item.evidenceCount} | messages=${item.messageCount}`);
      console.log(`  reason: ${item.reason}`);
    }
    console.log(
      `\nSEED COMPLETED — ${seededJobs.length} disputed jobs created for emails:`
    );
    console.log(`  poster: ${SEED_POSTER_EMAIL}`);
    console.log(`  driver: ${SEED_DRIVER_EMAIL}`);
  } finally {
    await mongoose.disconnect();
  }
}

void main();