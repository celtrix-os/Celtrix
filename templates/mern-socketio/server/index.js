require('dotenv').config();
const express = require('express');
const http = require('http');
// Mongoose is no longer needed
// const mongoose = require('mongoose'); 
const cors = require('cors');
const { Server } = require('socket.io');

const messageRoutes = require('./routes/messages');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
    },
});

// Middleware
app.use(cors());
app.use(express.json());

// Middleware to attach io to each request
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Routes
app.use('/api/messages', messageRoutes);

// Socket.io connection
io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Start server without database connection
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));