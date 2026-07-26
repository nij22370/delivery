import mongoose from "mongoose";

const ERROR_MSG_MISSING_URI = "Please define the MONGODB_URI environment variable in .env.local";

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(ERROR_MSG_MISSING_URI);
}

/**
 * Global cache for the Mongoose connection.
 *
 * In a serverless environment (e.g. Vercel), each function invocation may
 * spin up a new Node.js runtime. Without caching, every invocation would
 * open a fresh TCP connection to Atlas — quickly exhausting the free-tier
 * connection limit (512 connections on M0) and adding 200–500 ms of
 * connection overhead to every cold start.
 *
 * By storing the connection on the Node.js `global` object we ensure that
 * a warm Lambda/Edge reuse the existing connection instead of opening a new
 * one. The `global` object persists across multiple requests handled by the
 * same serverless instance.
 */
declare global {
  // eslint-disable-next-line no-var
  var mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

// Initialise the global cache the first time this module is imported.
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

const cached = global.mongoose;

async function connectDB(): Promise<mongoose.Connection> {
  // Return existing connection if one is already established.
  if (cached.conn) {
    return cached.conn;
  }

  // If a connection attempt is already in-flight, await it rather than
  // opening a second parallel connection.
  if (!cached.promise) {
    const opts: mongoose.ConnectOptions = {
      bufferCommands: false, // Fail fast — don't queue operations while disconnected.
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((m) => m.connection);
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    // Reset the promise so the next call retries instead of hanging forever.
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}

export default connectDB;
