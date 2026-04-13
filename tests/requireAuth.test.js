const requireAuth = require('../middleware/requireAuth');

function makeReq(path, authenticated = false) {
  return { path, isAuthenticated: () => authenticated };
}

function makeRes() {
  const res = {
    redirect: jest.fn(),
    status:   jest.fn(),
    json:     jest.fn(),
  };
  res.status.mockReturnValue(res);
  return res;
}

// Ensure NODE_ENV is not "test" so the auth bypass doesn't short-circuit.
beforeAll(() => { process.env.NODE_ENV = 'production'; });
afterAll(()  => { process.env.NODE_ENV = 'test'; });

// ── Static asset passthrough ───────────────────────────────────────────────
test('passes through .js requests without auth', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/app.js'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});

test('passes through .css requests without auth', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/style.css'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});

test('passes through .json requests without auth', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/demo-games.json'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});

// ── Public routes ──────────────────────────────────────────────────────────
test('passes through /login without auth', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/login'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});

test('passes through /demo without auth', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/demo'), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});

// ── Protected routes ───────────────────────────────────────────────────────
test('redirects unauthenticated request for / to /login', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/'), res, next);
  expect(res.redirect).toHaveBeenCalledWith('/login');
  expect(next).not.toHaveBeenCalled();
});

test('returns 401 JSON for unauthenticated API requests', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/api/why'), res, next);
  expect(res.status).toHaveBeenCalledWith(401);
  expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
  expect(next).not.toHaveBeenCalled();
});

test('passes through authenticated request for /', () => {
  const next = jest.fn();
  const res  = makeRes();
  requireAuth(makeReq('/', true), res, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(res.redirect).not.toHaveBeenCalled();
});
