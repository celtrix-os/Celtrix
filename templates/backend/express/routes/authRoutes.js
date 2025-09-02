const express = require('express');
const { generateToken } = require('../auth/jwt');
const authMiddleware = require('../auth/authMiddleware');

const router = express.Router();

// Dummy login for demo
router.post('/login', (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: 'Username is required' });
  }

  // Normally, validate username + password here
  const token = generateToken({ username });

  res.json({ token });
});

// Protected route
router.get('/protected', authMiddleware, (req, res) => {
  res.json({ message: `Hello ${req.user.username}, you accessed a protected route!` });
});

module.exports = router;
