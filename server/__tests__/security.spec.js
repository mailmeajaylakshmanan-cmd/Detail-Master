const xss = require('xss');

describe('Security Controls: CORS, CSRF, and Input Sanitization', () => {
  describe('CORS Allowlist Security', () => {
    const allowedOrigins = [
      'https://manage.detailingmasters.in',
      'https://detailingmasters.in',
      'http://localhost:5173',
      'http://localhost:3000'
    ];

    function isOriginAllowed(origin) {
      if (!origin) return true; // same-origin or local curl
      return allowedOrigins.includes(origin);
    }

    test('permits whitelisted production and local domains', () => {
      expect(isOriginAllowed('https://manage.detailingmasters.in')).toBe(true);
      expect(isOriginAllowed('https://detailingmasters.in')).toBe(true);
      expect(isOriginAllowed('http://localhost:5173')).toBe(true);
    });

    test('strictly rejects unapproved third-party or attacker origins (no wildcard vercel.app)', () => {
      expect(isOriginAllowed('https://attacker-domain.vercel.app')).toBe(false);
      expect(isOriginAllowed('https://evil.com')).toBe(false);
      expect(isOriginAllowed('https://manage.detailingmasters.in.fake.com')).toBe(false);
    });
  });

  describe('CSRF Protection', () => {
    function verifyCsrf(req) {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return { ok: true };

      // Bearer token from authorization header bypasses double-submit cookie
      const authHeader = req.headers?.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        return { ok: true };
      }

      const tokenFromCookie = req.cookies?.csrfToken;
      const tokenFromHeader = req.headers?.['x-csrf-token'];

      if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
        return { ok: false, status: 403, message: 'CSRF token missing or invalid' };
      }

      return { ok: true };
    }

    test('allows safe read methods without CSRF tokens', () => {
      expect(verifyCsrf({ method: 'GET' }).ok).toBe(true);
      expect(verifyCsrf({ method: 'OPTIONS' }).ok).toBe(true);
    });

    test('blocks mutating requests when CSRF tokens do not match', () => {
      const req = {
        method: 'POST',
        cookies: { csrfToken: 'token-abc' },
        headers: { 'x-csrf-token': 'token-xyz' }
      };
      const res = verifyCsrf(req);
      expect(res.ok).toBe(false);
      expect(res.status).toBe(403);
    });

    test('allows mutating requests when CSRF header matches cookie', () => {
      const req = {
        method: 'POST',
        cookies: { csrfToken: 'valid-secret-token-123' },
        headers: { 'x-csrf-token': 'valid-secret-token-123' }
      };
      expect(verifyCsrf(req).ok).toBe(true);
    });
  });

  describe('XSS Input Sanitization', () => {
    function sanitizeValue(value) {
      if (typeof value === 'string') {
        return xss(value);
      }
      return value;
    }

    test('strips malicious <script> tags and onerror event handlers', () => {
      const maliciousName = 'John Doe <script>alert("XSS")</script>';
      const sanitized = sanitizeValue(maliciousName);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('John Doe &lt;script&gt;alert("XSS")&lt;/script&gt;');

      const maliciousImg = '<img src=x onerror=alert(1)>';
      const sanitizedImg = sanitizeValue(maliciousImg);
      expect(sanitizedImg).not.toContain('onerror');
    });
  });
});
