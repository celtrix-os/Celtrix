import { io } from 'socket.io-client';

// Use the backend URL from your server.
// The server is running on port 5000.
const URL = 'http://localhost:5000';
const socket = io(URL);

export default socket;