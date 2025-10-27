import { io } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// enable reconnection and transports, and log connection attempts
const socket = io(URL, {
  transports: ["websocket", "polling"],
  reconnectionAttempts: 5,
  autoConnect: true,
});

socket.on("connect_error", (err) => {
  // will show CORS / version / network errors
  console.error("Socket connect_error:", err.message || err);
});
socket.on("reconnect_attempt", () => {
  console.info("Socket reconnect attempt");
});
socket.on("connect", () => {
  console.info("Socket connected, id=", socket.id);
});
socket.on("disconnect", (reason) => {
  console.info("Socket disconnected:", reason);
});

export default socket;