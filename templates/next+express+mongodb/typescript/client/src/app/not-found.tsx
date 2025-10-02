import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 text-center">
                <div>
                    {/* 404 Illustration */}
                    <div className="mx-auto h-32 w-32 flex items-center justify-center bg-white rounded-full shadow-lg mb-8">
                        <div className="text-6xl font-bold text-indigo-600">404</div>
                    </div>

                    {/* Error Message */}
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">
                        Page Not Found
                    </h1>
                    <p className="text-lg text-gray-600 mb-8">
                        Oops! The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
                    </p>

                    {/* Action Buttons */}
                    <div className="space-y-4">
                        <Link
                            href="/"
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            ← Back to Home
                        </Link>

                        <button
                            onClick={() => window.history.back()}
                            className="w-full flex justify-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
                        >
                            ← Go Back
                        </button>
                    </div>
                </div>

                {/* Additional Help */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900 mb-2">Need help?</h3>
                    <p className="text-sm text-gray-600">
                        If you believe this is an error, please contact our support team or check our documentation.
                    </p>
                </div>
            </div>
        </div>
    )
}