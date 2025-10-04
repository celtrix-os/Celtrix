# React + Tailwind + Firebase

A simple React application with Tailwind CSS and Firebase integration.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Firebase:**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
   - Copy your Firebase config from Project Settings
   - Create a `.env` file in the root directory:
   ```env
   VITE_FIREBASE_API_KEY=your_api_key_here
   VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## What's Included

- ✅ **React 19** with Vite
- ✅ **Tailwind CSS v4** for styling
- ✅ **Firebase SDK** (Auth, Firestore, Storage)
- ✅ **ESLint** configuration
- ✅ **TypeScript** support (in TypeScript version)

## Firebase Services

- **Authentication** - Ready to use
- **Firestore** - NoSQL database
- **Storage** - File storage
- **Hosting** - Deploy with `firebase deploy`

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
