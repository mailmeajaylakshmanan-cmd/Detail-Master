const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
  let token = req.cookies?.token; // Taking token from Secure Cookie
  if (!token) {
    // Fallback to headers just in case during migration
    token = req.header('Authorization')?.replace('Bearer ', '');
  }

  if (!token) return res.status(401).json({ message: "Not authorized" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ message: "Token failed" });
  }
};

module.exports = protect;
module.exports.protect = protect;
