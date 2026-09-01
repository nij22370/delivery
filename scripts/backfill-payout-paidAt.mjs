#!/usr/bin/env node
/**
 * backfill-payout-paidAt.mjs
 *
 * One-time data backfill. For any Payout document where:
 *   - status === "paid"
 *   - paidAt is null or missing
 * set paidAt to createdAt. This corrects legacy records that were inserted
 * with status: "paid" outside the admin override endpoint (the only code
 * path that writes paidAt).
 *
 * Safe to re-run — the query is a no-op on already-fixed rows.
 *
 * Run from the project root:
 *   node scripts/backfill-payout-paidAt.mjs
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const envLocalPath = resolve(projectRoot, ".env.local");
const envPath = resolve(projectRoot, ".env");

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(envLocalPath);
loadEnvFile(envPath);

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Add it to .env.local or .env.");
  process.exit(1);
}

const PayoutSchema = new mongoose.Schema(
  {
    status: String,
    paidAt: Date,
    createdAt: Date,
    updatedAt: Date,
  },
  { timestamps: true }
);

const Payout =
  mongoose.models.Payout || mongoose.model("Payout", PayoutSchema);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log("Connected to MongoDB.");

  const matching = await Payout.countDocuments({
    status: "paid",
    paidAt: null,
  });
  console.log(`Found ${matching} paid payouts missing paidAt.`);

  if (matching === 0) {
    console.log("Nothing to backfill. Exiting.");
    await mongoose.disconnect();
    return;
  }

  const result = await Payout.collection.updateMany(
    { status: "paid", paidAt: null },
    [
      {
        $set: { paidAt: "$createdAt" },
      },
    ]
  );
  console.log(
    `Backfilled ${result.modifiedCount} payout document(s) (paidAt = createdAt).`
  );

  await mongoose.disconnect();
  console.log("Done.");
}

main().catch(async (error) => {
  console.error("Backfill failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore secondary disconnect error.
  }
  process.exit(1);
});
