import { io } from "socket.io-client";

type NotificationPayload = {
  _id?: string;
  type?: string;
  message: string;
  senderId?: string;
  createdAt?: Date | string;
  isRead?: boolean;
};

export async function emitRealtimeNotification(
  userId: string,
  data: NotificationPayload
) {
  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://127.0.0.1:3001";

  const socket = io(socketUrl, {
    transports: ["websocket"],
    autoConnect: true,
    timeout: 3000,
  });

  await new Promise<void>((resolve) => {
    const done = () => {
      socket.disconnect();
      resolve();
    };

    socket.on("connect", () => {
      socket.emit("sendNotification", { userId, data });
      done();
    });

    socket.on("connect_error", done);
    setTimeout(done, 2500);
  });
}
