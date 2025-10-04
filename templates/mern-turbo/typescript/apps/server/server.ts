import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

const mongoUri: string | undefined = process.env.MONGO_URI;
const port: number = parseInt(process.env.PORT || '5000', 10);

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req: any, res: any) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req: any, res: any) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: any, res: any, next: any) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

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
        .catch((err: Error) => {
            console.error("MongoDB connection failed:", err.message);
            app.listen(port, () => console.log(`Server running without DB on port ${port}`));
        });
}
