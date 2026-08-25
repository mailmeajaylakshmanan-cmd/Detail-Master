const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  
  // If the request was authenticated via Authorization header, CSRF is mitigated
  // because malicious sites cannot send custom headers.
  const authHeader = req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return next();
  }
  
  const tokenFromCookie = req.cookies?.csrfToken;
  const tokenFromHeader = req.header('x-csrf-token');
  
  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({ message: 'CSRF token missing or invalid' });
  }
  
  next();
};

module.exports = csrfProtection;
