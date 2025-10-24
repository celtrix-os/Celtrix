const express = require('express');
const router = express.Router();
const { getMessages, createMessage } = require('../controller/messages');

// Get all messages
router.get('/', getMessages);

// Create a new message
router.post('/', createMessage);

module.exports = router;