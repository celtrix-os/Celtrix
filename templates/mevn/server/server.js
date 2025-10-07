const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config();

const app = express();

const mongoUri = process.env.MONGO_URI; 
const port = process.env.PORT || 5000;

// Middleware to parse JSON
app.use(express.json());

// Connect to MongoDB and start server
// Safe MongoDB connection for scaffold
if (!mongoUri || mongoUri === "your_mongodb_uri_here") {
  console.warn("⚠️  No Mongo URI provided. Skipping DB connection. You can set it in .env later.");
  app.listen(port, () => console.log(`Server running without DB on port ${port}`));
} else {
  mongoose
    .connect(mongoUri)
    .then(() => {
      console.log("MongoDB connected");
      app.listen(port, () => console.log(`Server running on port ${port}`));
    })
    .catch((err) => {
      console.error("MongoDB connection failed:", err.message);
      app.listen(port, () => console.log(`Server running without DB on port ${port}`));
    });
}