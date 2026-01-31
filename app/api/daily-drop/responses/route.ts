import { NextResponse } from "next/server";
import {dbConnect} from "../../../lib/mongodb";
import DailyDropResponse from "../../../models/DailyDropResponse";

export async function GET() {
  await dbConnect();

  const responses = await DailyDropResponse.find({})
    .sort({ createdAt: -1 })
    .limit(20);

  return NextResponse.json(responses);
}
