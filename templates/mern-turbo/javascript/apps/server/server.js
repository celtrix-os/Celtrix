import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';

dotenv.config();

const app = express();
const mongoUri = process.env.MONGO_URI;
const port = process.env.PORT || 5000;

// Core middleware
app.use(express.json());
app.use(morgan('dev'));
app.use(helmet());
app.use(cors());

// Health endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'mern-turbo-server', env: process.env.NODE_ENV || 'development' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Start function with optional Mongo connection
function startServer() {
  if (!mongoUri || mongoUri === 'your_mongodb_uri_here') {
    console.warn('⚠️  No Mongo URI provided. Skipping DB connection. Set MONGO_URI in .env to enable.');
    return app.listen(port, () => console.log(`Server running without DB on port ${port}`));
  }

  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log('MongoDB connected');
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((err) => {
      console.error('MongoDB connection failed:', err.message);
      app.listen(port, () => console.log(`Server running without DB on port ${port}`));
    });
}

startServer();