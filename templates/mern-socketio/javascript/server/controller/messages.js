const Message = require('../models/Message');
// In-memory message store
let messages = [];

// @desc    Get all messages
// @route   GET /api/messages
// @access  Public
const getMessages = (req, res) => {
    res.json(messages);
};

// @desc    Create a new message
// @route   POST /api/messages
// @access  Public
const createMessage = (req, res) => {
    const { content, sender } = req.body;

    if (!content || !sender) {
        return res.status(400).json({ message: 'Content and sender are required' });
    }

    const newMessage = {
        id: messages.length + 1, // Simple ID generation
        content,
        sender,
        createdAt: new Date(),
    };

    messages.push(newMessage);
    
    // Emit the new message to all connected clients
    if (req.io) {
        req.io.emit('newMessage', newMessage);
    }

    res.status(201).json(newMessage);
};

module.exports = {
    getMessages,
    createMessage,
};