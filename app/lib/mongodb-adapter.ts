/* eslint-disable @typescript-eslint/ban-ts-comment */
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI!;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

if (!process.env.MONGODB_URI) {
  throw new Error("Please add MONGODB_URI to .env");
}

if (process.env.NODE_ENV === "development") {
  // @ts-expect-error
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
   
    // @ts-ignore
    global._mongoClientPromise = client.connect();
  }

  // @ts-ignore
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

export default clientPromise;
