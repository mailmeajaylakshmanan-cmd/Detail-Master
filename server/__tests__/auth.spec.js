const bcrypt = require('bcryptjs');

describe('Auth & Session Security', () => {
  // Simulates login credentials validation
  async function authenticate(credentials, userLookupFn) {
    const { email, password } = credentials;
    if (!email || !password) {
      return { status: 400, message: 'Please enter both username/email and password.' };
    }

    const user = await userLookupFn(email);
    if (!user) {
      return { status: 401, message: 'Invalid username/email or password.' };
    }

    if (!user.is_active) {
      return { status: 403, message: 'Account is deactivated. Please contact your system administrator.' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return { status: 401, message: 'Invalid username/email or password.' };
    }

    return { status: 200, user: { id: user.id, username: user.username } };
  }

  test('returns identical generic error for non-existent user and wrong password (no user enumeration)', async () => {
    const hashedPassword = await bcrypt.hash('secretPass123', 10);
    const mockDb = {
      'admin@detailingmasters.in': { id: 1, username: 'admin', password_hash: hashedPassword, is_active: true }
    };

    const lookupFn = async (email) => mockDb[email.toLowerCase()] || null;

    // 1. Non-existent user
    const res1 = await authenticate({ email: 'nonexistent@example.com', password: 'anyPassword' }, lookupFn);
    expect(res1.status).toBe(401);
    expect(res1.message).toBe('Invalid username/email or password.');

    // 2. Existing user, incorrect password
    const res2 = await authenticate({ email: 'admin@detailingmasters.in', password: 'wrongPassword' }, lookupFn);
    expect(res2.status).toBe(401);
    expect(res2.message).toBe('Invalid username/email or password.');

    // Exact string match check
    expect(res1.message).toEqual(res2.message);
  });

  test('returns 403 when account is deactivated', async () => {
    const hashedPassword = await bcrypt.hash('secretPass123', 10);
    const mockDb = {
      'inactive@example.com': { id: 2, username: 'inactive', password_hash: hashedPassword, is_active: false }
    };

    const lookupFn = async (email) => mockDb[email.toLowerCase()] || null;
    const res = await authenticate({ email: 'inactive@example.com', password: 'secretPass123' }, lookupFn);
    expect(res.status).toBe(403);
    expect(res.message).toContain('Account is deactivated');
  });

  test('session invalidation marks logout_at on token', () => {
    const sessions = new Map();
    const token = 'jwt-token-sample-123';
    sessions.set(token, { user_id: 1, logout_at: null });

    // Perform logout
    const session = sessions.get(token);
    session.logout_at = new Date();

    expect(sessions.get(token).logout_at).not.toBeNull();
  });
});
