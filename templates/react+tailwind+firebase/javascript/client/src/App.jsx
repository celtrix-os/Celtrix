import React from 'react';
import { auth, db } from './firebase/config';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-6">
          React + Tailwind + Firebase
        </h1>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <h2 className="font-semibold text-blue-900">✅ React + Vite</h2>
            <p className="text-blue-700 text-sm">Modern React setup with Vite</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <h2 className="font-semibold text-green-900">✅ Tailwind CSS</h2>
            <p className="text-green-700 text-sm">Utility-first CSS framework</p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <h2 className="font-semibold text-orange-900">✅ Firebase</h2>
            <p className="text-orange-700 text-sm">Auth & Firestore configured</p>
          </div>
        </div>
        <div className="mt-6 text-center">
          <p className="text-gray-600 text-sm">
            Check <code className="bg-gray-200 px-2 py-1 rounded">src/firebase/config.js</code> to configure your Firebase project
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;