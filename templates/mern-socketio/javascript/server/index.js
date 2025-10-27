import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { initializeSocket } from "./socketHandler.js"; // Import the new handler

const app = express();
const server = http.createServer(app);

// Initialize Socket.io server
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// A simple API route for health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Initialize all socket event listeners
initializeSocket(io);

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
