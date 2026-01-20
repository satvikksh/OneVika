import express, { Request, Response } from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();

/* ✅ REQUIRED FOR RAILWAY */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("🚀 Socket server is running");
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  path: "/socket.io",
  cors: {
    origin: [
      "http://localhost:3000",
      "https://onevika.vercel.app" // 👈 your frontend
    ],
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  console.log("✅ Socket connected:", socket.id);
});

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`🚀 Socket server running on ${PORT}`);
});
