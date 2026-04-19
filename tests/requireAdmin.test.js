const requireAdmin = require('../middleware/requireAdmin');

function makeReq(role = null, authenticated = true) {
  return {
    path: '/api/admin/users',
    isAuthenticated: () => authenticated,
    user: authenticated ? { role } : null,
  };
}

function makeRes() {
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return res;
}

beforeAll(() => { process.env.NODE_ENV = 'production'; });
afterAll(()  => { process.env.NODE_ENV = 'test'; });

test('passes through admin users', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAdmin(makeReq('admin'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});

test('returns 403 for authenticated non-admin users', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAdmin(makeReq('user'), res, next);
  expect(res.status).toHaveBeenCalledWith(403);
  expect(res.json).toHaveBeenCalledWith({ error: 'Admin access required' });
  expect(next).not.toHaveBeenCalled();
});

test('returns 401 for unauthenticated requests', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAdmin(makeReq(null, false), res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  expect(next).not.toHaveBeenCalled();
});

test('bypasses check in test mode', () => {
  process.env.NODE_ENV = 'test';
  const next = jest.fn();
  const res  = makeRes();
  requireAdmin(makeReq('user'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
  process.env.NODE_ENV = 'production';
});
