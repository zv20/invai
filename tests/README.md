# Testing Guide

## Overview

This project has comprehensive test coverage with both unit and integration tests.

## Test Structure

```
tests/
├── unit/              # Unit tests (isolated, no dependencies)
│   ├── cache-manager.test.js
│   ├── activity-logger.test.js
│   └── csv-export.test.js
├── integration/       # Integration tests (require running server)
│   ├── auth-api.test.js
│   ├── products-api.test.js
│   └── batches-api.test.js
└── setup.js          # Jest configuration
```

## Running Tests

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests
**Important:** Server must be running before integration tests!

```bash
# Terminal 1: Start server
npm start

# Terminal 2: Run integration tests
npm run test:integration
```

### All Tests
```bash
npm run test:all
```

### With Coverage
```bash
npm run test:coverage
```

## Integration Test Prerequisites

### Required: Admin User

Integration tests require an admin user with these credentials:
- **Username**: `admin`
- **Password**: `admin123`

If this user doesn't exist, integration tests will skip authenticated tests.

### Creating Test User

**Option 1: Via UI** (easiest)
1. Start the server: `npm start`
2. Open browser: `http://localhost:3000`
3. Register a new user with username `admin` and password `admin123`
4. Upgrade to admin role via database or another admin user

**Option 2: Via API**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123","role":"admin"}'
```

**Option 3: Manually** 
Run integration tests against your existing admin account by updating test credentials in:
- `tests/integration/auth-api.test.js`
- `tests/integration/products-api.test.js`
- `tests/integration/batches-api.test.js`

## Test Environment

Integration tests use:
- **Base URL**: `http://localhost:3000` (default)
- **Database**: Your running `inventory.db`
- **Auth**: JWT tokens from login

You can override the base URL:
```bash
TEST_BASE_URL=http://localhost:3001 npm run test:integration
```

## CI/CD Pipeline

GitHub Actions automatically runs all tests on:
- Every push to `main` or `beta`
- Every pull request

The pipeline:
1. Runs unit tests first
2. Starts a test server
3. Runs integration tests
4. Uploads coverage to Codecov

## Writing New Tests

### Unit Tests

```javascript
const MyModule = require('../../lib/my-module');

describe('MyModule', () => {
  test('should do something', () => {
    const result = MyModule.doSomething();
    expect(result).toBe('expected');
  });
});
```

### Integration Tests

```javascript
const request = require('supertest');
const BASE_URL = 'http://localhost:3000';

describe('My API', () => {
  let authToken;

  beforeAll(async () => {
    const response = await request(BASE_URL)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'admin123' });
    authToken = response.body.token;
  });

  test('should access protected route', async () => {
    const response = await request(BASE_URL)
      .get('/api/protected')
      .set('Authorization', `Bearer ${authToken}`);
    expect(response.status).toBe(200);
  });
});
```

## Troubleshooting

### Integration Tests Failing with 401

**Problem**: Tests show "Could not authenticate - tests may fail"

**Solution**: Create admin user with correct credentials (see above)

### Integration Tests Timing Out

**Problem**: Tests hang or timeout

**Solution**: Make sure server is running first:
```bash
# Check if server is responding
curl http://localhost:3000/health
```

### Tests Pass Locally but Fail in CI

**Problem**: CI environment differences

**Solution**: Check `.github/workflows/test.yml` for environment setup

## Coverage Goals

- **Unit Tests**: 60%+ coverage
- **Integration Tests**: All major API endpoints
- **Overall**: 55-60% minimum

## Current Status

✅ **Unit Tests**: 58 tests, 100% passing  
⚠️ **Integration Tests**: 36 tests, requires admin user  
✅ **CI/CD**: GitHub Actions configured  

---

For questions or issues, check the main project README or open an issue.
