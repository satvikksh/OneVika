import { NextResponse } from "next/server";
import Thought from "../../../models/Thought";
import { dbConnect } from "../../../lib/mongodb";

export async function POST(req: Request) {
  await dbConnect();
  const data = await req.json();
  const thought = await Thought.create(data);
  return NextResponse.json(thought);
}
