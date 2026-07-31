const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// Short TTL cache so protect() does not hit login_sessions on every request
const SESSION_CACHE_TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS || 30_000);
const sessionCache = new Map(); // token -> expiresAt

function cacheGet(token) {
  const exp = sessionCache.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    sessionCache.delete(token);
    return false;
  }
  return true;
}

function cacheSet(token) {
  sessionCache.set(token, Date.now() + SESSION_CACHE_TTL_MS);
}

function cacheDelete(token) {
  sessionCache.delete(token);
}

const protect = async (req, res, next) => {
  let token = req.cookies?.token;
  if (!token) {
    token = req.header('Authorization')?.replace('Bearer ', '');
  }

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkey';
    const decoded = jwt.verify(token, secret);

    if (!cacheGet(token)) {
      const result = await pool.query(
        'SELECT id FROM public.login_sessions WHERE token = $1 AND logout_at IS NULL',
        [token]
      );
      if (result.rows.length === 0) {
        return res.status(401).json({ message: "Session expired or invalid" });
      }
      cacheSet(token);
    }

    req.user = decoded;
    req.token = token;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
module.exports.protect = protect;
module.exports.invalidateSessionCache = cacheDelete;
