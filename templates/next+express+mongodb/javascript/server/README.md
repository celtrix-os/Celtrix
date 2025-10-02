# Express.js + MongoDB Server

A RESTful API server built with Express.js, MongoDB, and JavaScript.

## Features

- 🚀 **Express.js** - Fast, unopinionated web framework
- 🍃 **MongoDB** with Mongoose ODM
- 🔒 **Security** with Helmet and CORS
- 🟨 **JavaScript** with ES6 modules
- 🔍 **Request logging** with Morgan
- ✅ **Input validation** and error handling
- 📡 **RESTful API** endpoints

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)

### Installation

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Update environment variables in `.env`:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/nextexpress
CLIENT_URL=http://localhost:3000
```

### Development

Start the development server with hot reload:

```bash
npm run dev
```

### Production

Start the production server:

```bash
npm start
```

## API Endpoints

### Users

| Method | Endpoint         | Description     |
| ------ | ---------------- | --------------- |
| GET    | `/api/users`     | Get all users   |
| GET    | `/api/users/:id` | Get user by ID  |
| POST   | `/api/users`     | Create new user |
| PUT    | `/api/users/:id` | Update user     |
| DELETE | `/api/users/:id` | Delete user     |

### Health Check

| Method | Endpoint      | Description     |
| ------ | ------------- | --------------- |
| GET    | `/`           | API information |
| GET    | `/api/health` | Health check    |

## Project Structure

```
├── controllers/
│   └── userController.js    # User route handlers
├── models/
│   └── User.js             # User MongoDB model
├── routes/
│   └── userRoutes.js       # User API routes
└── server.js               # Express app setup
```

## User Model

```javascript
{
  name: String (required, 2-50 characters)
  email: String (required, unique, valid email)
  createdAt: Date
  updatedAt: Date
}
```

## Environment Variables

- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 5000)
- `MONGODB_URI` - MongoDB connection string
- `CLIENT_URL` - Frontend URL for CORS (default: http://localhost:3000)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm start` - Start production server
