const { verifyToken } = require('./jwt');

const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }

  req.user = decoded; // attach payload (e.g., { id, email }) to request
  next();
};

module.exports = authMiddleware;
