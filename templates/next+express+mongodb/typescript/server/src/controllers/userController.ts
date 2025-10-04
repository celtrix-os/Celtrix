import { Request, Response } from 'express'
import User, { IUser } from '../models/User.js'

// Get all users
export const getUsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const users = await User.find().sort({ createdAt: -1 })
        res.status(200).json(users)
    } catch (error: any) {
        console.error('Error fetching users:', error)
        res.status(500).json({
            message: 'Error fetching users',
            error: error.message
        })
    }
}

// Get user by ID
export const getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findById(req.params.id)

        if (!user) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        res.status(200).json(user)
    } catch (error: any) {
        console.error('Error fetching user:', error)

        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            res.status(400).json({ message: 'Invalid user ID format' })
            return
        }

        res.status(500).json({
            message: 'Error fetching user',
            error: error.message
        })
    }
}

// Create new user
export const createUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email } = req.body

        // Validate required fields
        if (!name || !email) {
            res.status(400).json({
                message: 'Name and email are required'
            })
            return
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email })
        if (existingUser) {
            res.status(409).json({
                message: 'User with this email already exists'
            })
            return
        }

        // Create new user
        const user = new User({ name, email })
        const savedUser = await user.save()

        res.status(201).json(savedUser)
    } catch (error: any) {
        console.error('Error creating user:', error)

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message)
            res.status(400).json({
                message: 'Validation error',
                errors: messages
            })
            return
        }

        res.status(500).json({
            message: 'Error creating user',
            error: error.message
        })
    }
}

// Update user
export const updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const { name, email } = req.body

        // Check if user exists
        const user = await User.findById(req.params.id)
        if (!user) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        // Check if email is being changed and if it already exists
        if (email && email !== user.email) {
            const existingUser = await User.findOne({ email })
            if (existingUser) {
                res.status(409).json({
                    message: 'User with this email already exists'
                })
                return
            }
        }

        // Update user
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { ...(name && { name }), ...(email && { email }) },
            { new: true, runValidators: true }
        )

        res.status(200).json(updatedUser)
    } catch (error: any) {
        console.error('Error updating user:', error)

        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            res.status(400).json({ message: 'Invalid user ID format' })
            return
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((err: any) => err.message)
            res.status(400).json({
                message: 'Validation error',
                errors: messages
            })
            return
        }

        res.status(500).json({
            message: 'Error updating user',
            error: error.message
        })
    }
}

// Delete user
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
    try {
        const user = await User.findByIdAndDelete(req.params.id)

        if (!user) {
            res.status(404).json({ message: 'User not found' })
            return
        }

        res.status(200).json({
            message: 'User deleted successfully',
            deletedUser: user
        })
    } catch (error: any) {
        console.error('Error deleting user:', error)

        // Handle invalid ObjectId
        if (error.name === 'CastError') {
            res.status(400).json({ message: 'Invalid user ID format' })
            return
        }

        res.status(500).json({
            message: 'Error deleting user',
            error: error.message
        })
    }
}