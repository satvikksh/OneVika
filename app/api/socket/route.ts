import { Server } from "socket.io";
import { NextResponse } from "next/server";

let io: Server | null = null;

export async function GET() {
  if (!io) {
    io = new Server(3000, {
      path: "/api/socket",
    });

    io.on("connection", (socket) => {
      console.log("Socket connected:", socket.id);

      socket.on("send_message", (msg) => {
        socket.broadcast.emit("receive_message", msg);
      });
    });
  }

  return NextResponse.json({ ok: true });
}
