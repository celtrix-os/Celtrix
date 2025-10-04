// Basic tests for auth endpoints using supertest and jest
const request = require('supertest');
const app = require('../server');
const mongoose = require('mongoose');
const User = require('../models/User');

describe('Auth API', () => {
  beforeAll(async () => {
    // Connect to test DB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/testdb', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should not register an existing user', async () => {
      await User.create({ name: 'Test', email: 'test@example.com', password: 'hashed' });
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'test@example.com', password: 'password123' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const password = 'password123';
      const hashed = await require('bcrypt').hash(password, 10);
      await User.create({ name: 'Test', email: 'test@example.com', password: hashed });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password });
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should not login with wrong password', async () => {
      const hashed = await require('bcrypt').hash('password123', 10);
      await User.create({ name: 'Test', email: 'test@example.com', password: hashed });
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' });
      expect(res.statusCode).toBe(400);
    });
  });
});
