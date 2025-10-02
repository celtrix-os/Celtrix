import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import dotenv from 'dotenv'
import mongoose from 'mongoose'
import userRoutes from './routes/userRoutes.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Security middleware
app.use(helmet())

// CORS configuration
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    credentials: true
}))

// Logging middleware
app.use(morgan('combined'))

// Body parsing middleware
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Connect to MongoDB
const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nextexpress')
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`)
    } catch (error) {
        console.error('❌ MongoDB connection error:', error)
        process.exit(1)
    }
}

connectDB()

// Routes
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Express + MongoDB API Server',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        endpoints: {
            users: '/api/users',
            health: '/api/health'
        }
    })
})

app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    })
})

// API routes
app.use('/api/users', userRoutes)

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'production' ? {} : err.message
    })
})

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ message: 'Route not found' })
})

// Start server
app.listen(PORT, () => {
    console.log(`🌟 Server running on port ${PORT}`)
    console.log(`📍 Server URL: http://localhost:${PORT}`)
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
})

export default app