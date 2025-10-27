export const initializeSocket = (io) => {
  io.on("connection", (socket) => {
    console.log(`⚡: A user connected with ID: ${socket.id}`);

    // Listen for a generic event from a client
    socket.on("sampleEvent", (data) => {
      console.log(`Received sampleEvent from ${socket.id} with data:`, data);
      socket.broadcast.emit("broadcastEvent", { senderId: socket.id, data });
      socket.emit("eventResponse", {
        status: "success",
        message: "sampleEvent received",
      });
    });

    // ADD THIS NEW EVENT HANDLER
    // Listen for a ping event for direct client-server communication
    socket.on("pingServer", (callback) => {
      console.log(`Received ping from ${socket.id}`);
      // Respond with a pong event directly to the sender
      callback({ status: "ok", timestamp: new Date() });
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
      console.log(`A user disconnected with ID: ${socket.id}`);
    });
  });
};
