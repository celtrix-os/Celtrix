# MERN + Socket.io Generic Real-Time Template

This project is a generic template for building real-time applications using Express, React, and Socket.io. It provides a clean foundation for features like live notifications, data broadcasting, and direct client-server communication.

## Project Structure

```
mern-socketio/
├── client/                # Vite + React frontend
│   ├── src/
│   │   ├── App.jsx        # Main UI component with socket logic
│   │   ├── App.css        # Styles for the application
│   │   ├── main.jsx       # React entry point
│   │   └── socket.js      # Socket.io client setup
│   ├── index.html         # Main HTML file
│   └── package.json       # Frontend dependencies
└── server/                # Express + Socket.io backend
    ├── socketHandler.js   # Core logic for handling all socket events
    ├── index.js           # Express server entry point
    ├── .env.example       # Example environment variables
    └── package.json       # Backend dependencies
```

## Getting Started

This template is designed to be scaffolded by the Celtrix CLI. After the project is created, all dependencies will be installed automatically if you selected that option during setup.

### Running the Application

To run the application, you need to open two separate terminal windows inside your newly created project folder.

**1. Start the Backend Server:**

```bash
cd server
npm start
```

The server will start on `http://localhost:5000`.

**2. Start the Frontend Client:**

```bash
cd client
npm run dev
```

The client application will open in your browser at `http://localhost:3000`.

## Features

- **Generic Real-Time Foundation:** A clean starting point for any real-time feature.
- **Socket.io Event Handling:** Demonstrates connection, disconnection, broadcasting, and direct request/response patterns.
- **Clean UI:** A simple interface to visualize the connection status, emit events, and view a real-time log of socket activity.
- **Decoupled Backend:** Server setup is separated from real-time event handling (`index.js` vs. `socketHandler.js`).
- **No Database Required:** Runs out-of-the-box without needing a database setup.
