import { Server } from "socket.io";

const io = new Server(3001, {
  cors: {
    origin: "*",
  },
});

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join-room", ({ roomId, user }) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = { users: [], thoughts: [] };

    rooms[roomId].users.push(user);

    io.to(roomId).emit("room-users", rooms[roomId].users);
    io.to(roomId).emit("room-thoughts", rooms[roomId].thoughts);
  });

  socket.on("new-thought", ({ roomId, thought }) => {
    rooms[roomId].thoughts.push(thought);
    io.to(roomId).emit("room-thoughts", rooms[roomId].thoughts);
  });

  socket.on("disconnect", () => {
    // optional cleanup
  });
});

console.log("🧠 Brain Socket running on :3001");
