const csrfProtection = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  
  const tokenFromCookie = req.cookies?.csrfToken;
  const tokenFromHeader = req.header('x-csrf-token');
  
  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({ message: 'CSRF token missing or invalid' });
  }
  
  next();
};

module.exports = csrfProtection;
