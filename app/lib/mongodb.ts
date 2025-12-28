import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: MongooseCache | undefined;
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  if (cached!.conn) return cached!.conn;

  const MONGODB_URI = process.env.MONGODB_URI;

  // ✅ CHECK MOVED HERE (LAZY)
  if (!MONGODB_URI) {
    throw new Error("❌ MONGODB_URI is not defined at runtime");
  }

  if (!cached!.promise) {
    cached!.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
  }

  cached!.conn = await cached!.promise;
  return cached!.conn;
}
