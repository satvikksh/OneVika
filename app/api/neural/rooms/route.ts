import { NextResponse } from "next/server";
import Room from "../../../models/Room";
import { dbConnect } from "../../../lib/mongodb";

export async function GET() {
  await dbConnect();
  const rooms = await Room.find();
  return NextResponse.json(rooms);
}
