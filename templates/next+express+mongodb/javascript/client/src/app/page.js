'use client'

import { useState, useEffect } from 'react'
import { UserCard } from '@/components/UserCard'
import { AddUserForm } from '@/components/AddUserForm'

export default function Home() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchUsers = async () => {
        try {
            setLoading(true)
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/users`)
            if (!response.ok) {
                throw new Error('Failed to fetch users')
            }
            const data = await response.json()
            setUsers(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchUsers()
    }, [])

    const handleUserAdded = () => {
        fetchUsers()
    }

    const handleUserDeleted = (userId) => {
        setUsers(users.filter(user => user._id !== userId))
    }

    return (
        <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl md:text-6xl">
                        Next.js + Express + MongoDB
                    </h1>
                    <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
                        A modern full-stack application template with JavaScript, TailwindCSS, and MongoDB integration.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Add User Form */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Add New User</h2>
                        <AddUserForm onUserAdded={handleUserAdded} />
                    </div>

                    {/* Users List */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Users</h2>

                        {loading && (
                            <div className="flex justify-center items-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            </div>
                        )}

                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-4">
                                <p className="text-red-600">{error}</p>
                                <button
                                    onClick={fetchUsers}
                                    className="mt-2 text-sm text-red-800 hover:text-red-900 underline"
                                >
                                    Try again
                                </button>
                            </div>
                        )}

                        {!loading && !error && users.length === 0 && (
                            <p className="text-gray-500 text-center py-8">No users found. Add your first user!</p>
                        )}

                        {!loading && !error && users.length > 0 && (
                            <div className="space-y-4">
                                {users.map((user) => (
                                    <UserCard
                                        key={user._id}
                                        user={user}
                                        onUserDeleted={handleUserDeleted}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* API Status Indicator */}
                <div className="mt-12 text-center">
                    <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-800">
                        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                        API Connected
                    </div>
                </div>
            </div>
        </main>
    )
}