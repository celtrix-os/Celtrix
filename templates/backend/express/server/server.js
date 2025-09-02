const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());

const authRoutes = require('../routes/authRoutes');
app.use('/api/auth', authRoutes);

// Sample route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from Express!' });
});

// Connect to MongoDB

// mongoose.connect(process.env.MONGODB_URI)
//   .then(() => console.log('Connected to MongoDB'))
//   .catch((error) => console.error('MongoDB connection error:', error));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));