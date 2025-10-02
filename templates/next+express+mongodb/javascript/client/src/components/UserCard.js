'use client'

import { useState } from 'react'

export function UserCard({ user, onUserDeleted }) {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this user?')) {
            return
        }

        setLoading(true)
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'}/api/users/${user._id}`, {
                method: 'DELETE',
            })

            if (!response.ok) {
                throw new Error('Failed to delete user')
            }

            onUserDeleted(user._id)
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Failed to delete user')
        } finally {
            setLoading(false)
        }
    }

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        })
    }

    return (
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500 mt-1">
                        Created: {formatDate(user.createdAt)}
                    </p>
                </div>
                <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Deleting...' : 'Delete'}
                </button>
            </div>
        </div>
    )
}