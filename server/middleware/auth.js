const jwt = require('jsonwebtoken');
const { pool } = require('../db');

const protect = async (req, res, next) => {
  let token = req.cookies?.token; // Taking token from Secure Cookie
  if (!token) {
    // Fallback to headers just in case during migration
    token = req.header('Authorization')?.replace('Bearer ', '');
  }

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey';
    const decoded = jwt.verify(token, secret);
    
    // Check if token exists in login_sessions and is active
    const result = await pool.query(
      'SELECT id FROM public.login_sessions WHERE token = $1 AND logout_at IS NULL',
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Session expired or invalid" });
    }

    req.user = decoded;
    req.token = token; // Make token available for logout route
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
module.exports.protect = protect;
