import mongoose from "mongoose";
import { ensureRetentionIndexes } from "./retention";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? {
  conn: null,
  promise: null,
};

global.mongoose = cached;

export async function dbConnect(): Promise<typeof mongoose> {
  if (cached.conn) return cached.conn;

  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is not defined");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cached.conn = await cached.promise;

  console.log("✅ MongoDB connected (mongoose)");

  if (cached.conn.connection.db) {
    void ensureRetentionIndexes(cached.conn.connection.db).catch((error) => {
      console.error("❌ Failed to ensure retention indexes:", error);
    });
  }

  return cached.conn;
}
export async function getNativeDb() {
  const conn = await dbConnect();

  if (!conn.connection.db) {
    throw new Error("❌ Native MongoDB db not available");
  }

  return conn.connection.db;
}
