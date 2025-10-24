# MERN Socket.io Real-Time Chat Application

This project is a simple chat application built using the MERN stack (MongoDB, Express, React, Node.js) with real-time communication capabilities powered by Socket.io.

## Project Structure

```
mern-socketio-app
├── client                # React frontend
│   ├── public
│   │   └── index.html    # Main HTML file
│   ├── src
│   │   ├── components
│   │   │   └── Chat.js    # Chat component for real-time messaging
│   │   ├── App.js         # Main App component
│   │   └── index.js       # Entry point for React application
│   └── package.json       # React dependencies
├── server                # Express backend
│   ├── models
│   │   └── Message.js     # Mongoose model for messages
│   ├── routes
│   │   └── messages.js     # API routes for messages
│   ├── index.js           # Entry point for Express server
│   └── package.json       # Express dependencies
├── package.json           # Main configuration file for the project
└── README.md              # Project documentation
```

## Getting Started

### Prerequisites

- Node.js
- MongoDB

### Installation

1. Clone the repository:

   ```
   git clone <repository-url>
   cd mern-socketio-app
   ```

2. Install server dependencies:

   ```
   cd server
   npm install
   ```

3. Install client dependencies:

   ```
   cd client
   npm install
   ```

### Running the Application

1. Start the MongoDB server.

2. Start the Express server:

   ```
   cd server
   npm start
   ```

3. Start the React client:

   ```
   cd client
   npm start
   ```

### Usage

- Open your browser and navigate to `http://localhost:3000` to access the chat application.
- You can send and receive messages in real-time.

### Features

- Real-time messaging using Socket.io.
- Messages are stored in a MongoDB database.
- Simple and clean user interface.
