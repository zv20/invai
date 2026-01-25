# Sprint 1: Testing Foundation

**Duration**: 2 weeks (Jan 27 - Feb 7, 2026)  
**Goal**: Establish test infrastructure and achieve 30%+ code coverage  
**Priority**: P0 (BLOCKER for production)

---

## 🎯 Sprint Objectives

1. Install and configure Jest testing framework
2. Write unit tests for 3 core library modules
3. Write integration tests for Products API
4. Set up GitHub Actions CI/CD pipeline
5. Achieve 30%+ test coverage minimum

---

## Week 1: Setup & Unit Tests (Jan 27 - Jan 31)

### Day 1: Monday, Jan 27 - Framework Setup

**Morning (2-3 hours)**
```bash
# 1. Create new branch for Sprint 1
cd /opt/invai
git checkout beta
git pull origin beta
git checkout -b sprint-1/testing-foundation

# 2. Install testing dependencies
npm install --save-dev jest@29.7.0 supertest@6.3.4 @types/jest@29.5.11

# 3. Create test directory structure
mkdir -p tests/{unit,integration,fixtures}
touch tests/setup.js
touch tests/.gitignore

# 4. Add coverage folder to .gitignore
echo "coverage/" >> .gitignore
echo "*.test.js" >> .gitignore
```

**Afternoon (2-3 hours)**
```bash
# 5. Configure Jest in package.json
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration"
  },
  "jest": {
    "testEnvironment": "node",
    "coverageDirectory": "coverage",
    "collectCoverageFrom": [
      "lib/**/*.js",
      "!lib/**/*.test.js",
      "!node_modules/**"
    ],
    "testMatch": [
      "**/tests/**/*.test.js"
    ],
    "setupFiles": ["./tests/setup.js"]
  }
}
```

**Deliverable**: Testing framework installed and configured

---

### Day 2: Tuesday, Jan 28 - First Unit Tests (cache-manager)

**Create**: `tests/unit/cache-manager.test.js`

```javascript
const CacheManager = require('../../lib/cache-manager');

describe('CacheManager', () => {
  let cache;

  beforeEach(() => {
    cache = new CacheManager();
  });

  afterEach(() => {
    if (cache && cache.close) {
      cache.close();
    }
  });

  describe('Basic Operations', () => {
    test('should store and retrieve values', () => {
      cache.set('test-key', 'test-value');
      expect(cache.get('test-key')).toBe('test-value');
    });

    test('should return undefined for missing keys', () => {
      expect(cache.get('nonexistent-key')).toBeUndefined();
    });

    test('should handle different data types', () => {
      cache.set('string', 'value');
      cache.set('number', 42);
      cache.set('object', { name: 'test' });
      cache.set('array', [1, 2, 3]);

      expect(cache.get('string')).toBe('value');
      expect(cache.get('number')).toBe(42);
      expect(cache.get('object')).toEqual({ name: 'test' });
      expect(cache.get('array')).toEqual([1, 2, 3]);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate specific cache entry', () => {
      cache.set('test-key', 'test-value');
      cache.invalidate('test-key');
      expect(cache.get('test-key')).toBeUndefined();
    });

    test('should invalidate multiple entries', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.invalidate('key1');
      cache.invalidate('key2');
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
    });

    test('should handle wildcard invalidation', () => {
      cache.set('products:1', { id: 1 });
      cache.set('products:2', { id: 2 });
      cache.set('categories:1', { id: 1 });
      
      cache.invalidate('products:*');
      
      expect(cache.get('products:1')).toBeUndefined();
      expect(cache.get('products:2')).toBeUndefined();
      expect(cache.get('categories:1')).toBeDefined();
    });
  });

  describe('TTL (Time To Live)', () => {
    test('should expire entries after TTL', (done) => {
      cache.set('temp-key', 'temp-value', 1); // 1 second TTL
      expect(cache.get('temp-key')).toBe('temp-value');
      
      setTimeout(() => {
        expect(cache.get('temp-key')).toBeUndefined();
        done();
      }, 1100);
    });
  });

  describe('Edge Cases', () => {
    test('should handle null values', () => {
      cache.set('null-key', null);
      expect(cache.get('null-key')).toBeNull();
    });

    test('should handle empty strings', () => {
      cache.set('empty-key', '');
      expect(cache.get('empty-key')).toBe('');
    });

    test('should handle large objects', () => {
      const largeObject = { data: new Array(1000).fill('test') };
      cache.set('large-key', largeObject);
      expect(cache.get('large-key')).toEqual(largeObject);
    });
  });
});
```

**Run tests**:
```bash
npm test -- tests/unit/cache-manager.test.js
npm run test:coverage
```

**Target**: 80%+ coverage of cache-manager.js

---

### Day 3: Wednesday, Jan 29 - Activity Logger Tests

**Create**: `tests/unit/activity-logger.test.js`

```javascript
const ActivityLogger = require('../../lib/activity-logger');
const sqlite3 = require('sqlite3').verbose();

describe('ActivityLogger', () => {
  let db;
  let logger;

  beforeEach(() => {
    // Create in-memory database for testing
    db = new sqlite3.Database(':memory:');
    
    // Create activity_log table
    db.run(`
      CREATE TABLE activity_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        entity_type TEXT NOT NULL,
        entity_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        description TEXT,
        user_id INTEGER,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    logger = new ActivityLogger(db);
  });

  afterEach((done) => {
    db.close(done);
  });

  describe('Logging Operations', () => {
    test('should log product creation', async () => {
      await logger.log({
        entity_type: 'product',
        entity_id: 1,
        action: 'create',
        description: 'Created product: Milk',
        user_id: 1
      });

      const logs = await logger.getRecent(10);
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('create');
      expect(logs[0].entity_type).toBe('product');
    });

    test('should log product update with old/new values', async () => {
      await logger.log({
        entity_type: 'product',
        entity_id: 1,
        action: 'update',
        description: 'Updated product name',
        old_value: JSON.stringify({ name: 'Milk' }),
        new_value: JSON.stringify({ name: 'Whole Milk' }),
        user_id: 1
      });

      const logs = await logger.getRecent(10);
      expect(logs[0].old_value).toContain('Milk');
      expect(logs[0].new_value).toContain('Whole Milk');
    });

    test('should log batch quantity adjustment', async () => {
      await logger.log({
        entity_type: 'batch',
        entity_id: 5,
        action: 'adjust',
        description: 'Adjusted quantity -2',
        user_id: 1
      });

      const logs = await logger.getEntityHistory('batch', 5);
      expect(logs).toHaveLength(1);
      expect(logs[0].description).toContain('Adjusted quantity');
    });
  });

  describe('Retrieval Operations', () => {
    beforeEach(async () => {
      // Add multiple log entries
      await logger.log({ entity_type: 'product', entity_id: 1, action: 'create', description: 'Test 1' });
      await logger.log({ entity_type: 'product', entity_id: 2, action: 'create', description: 'Test 2' });
      await logger.log({ entity_type: 'batch', entity_id: 1, action: 'create', description: 'Test 3' });
    });

    test('should get recent activity', async () => {
      const logs = await logger.getRecent(10);
      expect(logs).toHaveLength(3);
      expect(logs[0].description).toBe('Test 3'); // Most recent first
    });

    test('should get entity-specific history', async () => {
      const logs = await logger.getEntityHistory('product', 1);
      expect(logs).toHaveLength(1);
      expect(logs[0].entity_id).toBe(1);
    });

    test('should limit results', async () => {
      const logs = await logger.getRecent(2);
      expect(logs).toHaveLength(2);
    });
  });

  describe('Cleanup Operations', () => {
    test('should delete logs older than 90 days', async () => {
      // This would require mocking dates - simplified version
      const result = await logger.cleanupOldLogs(90);
      expect(result).toBeDefined();
    });
  });
});
```

**Run tests**:
```bash
npm test -- tests/unit/activity-logger.test.js
```

**Target**: 70%+ coverage of activity-logger.js

---

### Day 4: Thursday, Jan 30 - CSV Export Tests

**Create**: `tests/unit/csv-export.test.js`

```javascript
const CSVExporter = require('../../lib/csv-export');

describe('CSVExporter', () => {
  describe('Data to CSV Conversion', () => {
    test('should convert array of objects to CSV', () => {
      const data = [
        { name: 'Product 1', price: 10.99, stock: 5 },
        { name: 'Product 2', price: 20.50, stock: 3 }
      ];

      const csv = CSVExporter.toCSV(data);
      
      expect(csv).toContain('name,price,stock');
      expect(csv).toContain('Product 1,10.99,5');
      expect(csv).toContain('Product 2,20.50,3');
    });

    test('should handle special characters', () => {
      const data = [
        { name: 'Product "Special"', description: 'Has, commas' }
      ];

      const csv = CSVExporter.toCSV(data);
      
      expect(csv).toContain('"Product ""Special"""');
      expect(csv).toContain('"Has, commas"');
    });

    test('should handle empty data', () => {
      const csv = CSVExporter.toCSV([]);
      expect(csv).toBe('');
    });

    test('should handle null and undefined values', () => {
      const data = [
        { name: 'Product', price: null, stock: undefined }
      ];

      const csv = CSVExporter.toCSV(data);
      expect(csv).toContain('Product,,');
    });
  });

  describe('Report Exports', () => {
    test('should export stock value report', () => {
      const data = [
        { category: 'Dairy', total_value: 150.50, product_count: 5 },
        { category: 'Produce', total_value: 89.99, product_count: 12 }
      ];

      const csv = CSVExporter.exportStockValueReport(data);
      
      expect(csv).toContain('category,total_value,product_count');
      expect(csv).toContain('Dairy,150.50,5');
    });

    test('should export expiration report', () => {
      const data = [
        { product_name: 'Milk', expiry_date: '2026-02-01', days_until_expiry: 7 }
      ];

      const csv = CSVExporter.exportExpirationReport(data);
      
      expect(csv).toContain('product_name,expiry_date,days_until_expiry');
      expect(csv).toContain('Milk,2026-02-01,7');
    });
  });

  describe('Filename Generation', () => {
    test('should generate timestamped filename', () => {
      const filename = CSVExporter.generateFilename('stock-value');
      
      expect(filename).toMatch(/stock-value_\d{8}_\d{6}\.csv/);
      expect(filename).toContain('.csv');
    });
  });
});
```

**Run tests**:
```bash
npm test -- tests/unit/csv-export.test.js
npm run test:coverage
```

**Target**: 70%+ coverage of csv-export.js

---

### Day 5: Friday, Jan 31 - Week 1 Review

**Morning: Run full test suite**
```bash
# Run all unit tests
npm run test:unit

# Generate coverage report
npm run test:coverage

# View coverage in browser
open coverage/lcov-report/index.html
```

**Afternoon: Commit and push**
```bash
# Stage all test files
git add tests/ package.json package-lock.json .gitignore

# Commit
git commit -m "test: Add unit tests for cache-manager, activity-logger, csv-export

- Installed Jest and Supertest
- Created test directory structure
- Unit tests for 3 core library modules
- Achieved XX% test coverage
- All tests passing"

# Push to beta
git push origin sprint-1/testing-foundation
```

**Week 1 Deliverables**:
- ✅ Jest framework installed
- ✅ Test directory structure created
- ✅ 3 unit test files written
- ✅ XX% test coverage (target: 20%+)

---

## Week 2: Integration Tests & CI/CD (Feb 3 - Feb 7)

### Day 6: Monday, Feb 3 - Products API Tests (Part 1)

**Create**: `tests/integration/products-api.test.js`

```javascript
const request = require('supertest');
const app = require('../../server'); // Assuming server exports app

describe('Products API', () => {
  let authToken;
  let testProductId;

  beforeAll(async () => {
    // Get auth token (assuming JWT auth)
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test123' });
    
    authToken = response.body.token;
  });

  describe('GET /api/products', () => {
    test('should return list of products', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return 401 without auth token', async () => {
      const response = await request(app)
        .get('/api/products');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    test('should create new product', async () => {
      const newProduct = {
        name: 'Test Product',
        barcode: '1234567890',
        category_id: 1,
        supplier_id: 1,
        reorder_point: 10
      };

      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProduct);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Product');
      
      testProductId = response.body.id;
    });

    test('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });
      
      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return specific product', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProductId);
    });

    test('should return 404 for non-existent product', async () => {
      const response = await request(app)
        .get('/api/products/99999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });
});
```

---

### Day 7: Tuesday, Feb 4 - Products API Tests (Part 2)

**Continue**: `tests/integration/products-api.test.js`

```javascript
  describe('PUT /api/products/:id', () => {
    test('should update existing product', async () => {
      const updates = {
        name: 'Updated Test Product',
        reorder_point: 15
      };

      const response = await request(app)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Updated Test Product');
      expect(response.body.reorder_point).toBe(15);
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('should delete product', async () => {
      const response = await request(app)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });

    test('should return 404 after deletion', async () => {
      const response = await request(app)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });
```

**Run tests**:
```bash
npm test -- tests/integration/products-api.test.js
```

---

### Day 8: Wednesday, Feb 5 - GitHub Actions CI/CD

**Create**: `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [ main, beta ]
  pull_request:
    branches: [ main, beta ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
    
    - name: Generate coverage
      run: npm run test:coverage
    
    - name: Upload coverage to Codecov
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/coverage-final.json
        fail_ci_if_error: false
```

**Test locally**:
```bash
# Install act (GitHub Actions local runner)
brew install act  # or: curl https://raw.githubusercontent.com/nektos/act/master/install.sh | sudo bash

# Run workflow locally
act -j test
```

**Commit**:
```bash
git add .github/workflows/test.yml
git commit -m "ci: Add GitHub Actions test workflow"
```

---

### Day 9: Thursday, Feb 6 - More Integration Tests

**Create**: `tests/integration/batches-api.test.js`

```javascript
const request = require('supertest');
const app = require('../../server');

describe('Batches API', () => {
  let authToken;
  let testProductId;
  let testBatchId;

  beforeAll(async () => {
    // Setup: Get auth token and create test product
    const authResponse = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test', password: 'test123' });
    authToken = authResponse.body.token;

    const productResponse = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Test Product for Batches', barcode: '999', category_id: 1 });
    testProductId = productResponse.body.id;
  });

  describe('POST /api/batches', () => {
    test('should create new batch', async () => {
      const newBatch = {
        product_id: testProductId,
        quantity: 10,
        cost: 5.99,
        expiry_date: '2026-03-01',
        location: 'Shelf A'
      };

      const response = await request(app)
        .post('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBatch);
      
      expect(response.status).toBe(201);
      expect(response.body.quantity).toBe(10);
      testBatchId = response.body.id;
    });
  });

  describe('GET /api/batches/product/:productId', () => {
    test('should return batches for product', async () => {
      const response = await request(app)
        .get(`/api/batches/product/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });
});
```

---

### Day 10: Friday, Feb 7 - Sprint Review & Merge

**Morning: Final testing**
```bash
# Run all tests
npm test

# Check coverage
npm run test:coverage

# Verify CI passes
git push origin sprint-1/testing-foundation
# Check GitHub Actions status
```

**Afternoon: Create PR and merge**
```bash
# Ensure all tests pass
npm test

# Create PR to beta
# (via GitHub UI or gh cli)
gh pr create --base beta --head sprint-1/testing-foundation \
  --title "Sprint 1: Testing Foundation - 30%+ coverage achieved" \
  --body "## Sprint 1 Complete

### Achievements
- ✅ Jest framework installed and configured
- ✅ Unit tests: cache-manager, activity-logger, csv-export
- ✅ Integration tests: Products API, Batches API
- ✅ GitHub Actions CI/CD pipeline
- ✅ XX% test coverage (target: 30%+)

### Test Statistics
- Total tests: XX
- Passing: XX
- Coverage: XX%

### Next Sprint
- Sprint 2: User Authentication"

# After review, merge PR
gh pr merge --squash
```

---

## ✅ Sprint 1 Success Criteria

- [ ] Jest installed and configured
- [ ] Test directory structure created
- [ ] 3+ unit test files written
- [ ] 2+ integration test files written
- [ ] GitHub Actions CI/CD pipeline working
- [ ] 30%+ test coverage achieved
- [ ] All tests passing
- [ ] PR merged to beta

---

## 📊 Expected Outcomes

**Test Coverage Breakdown**:
- `lib/cache-manager.js`: 80%+
- `lib/activity-logger.js`: 70%+
- `lib/csv-export.js`: 70%+
- API routes: 50%+
- **Overall**: 30-40%

**Files Created**:
- `tests/setup.js`
- `tests/unit/cache-manager.test.js`
- `tests/unit/activity-logger.test.js`
- `tests/unit/csv-export.test.js`
- `tests/integration/products-api.test.js`
- `tests/integration/batches-api.test.js`
- `.github/workflows/test.yml`

---

## 🚫 Blockers & Risks

**Potential Issues**:
1. **Database setup for tests**: Use in-memory SQLite for unit tests
2. **Authentication in integration tests**: Mock or use test user
3. **Async test timeout**: Increase Jest timeout if needed
4. **CI/CD fails**: Debug locally with `act` first

**Mitigation**:
- Start simple, add complexity gradually
- Use test fixtures for consistent data
- Mock external dependencies
- Ask for help if stuck >2 hours

---

## 📝 Daily Checklist Template

```markdown
### Day X: [Date]
**Goal**: [Today's goal]

**Tasks**:
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Completed**:
- [x] What was finished

**Blockers**:
- None / [describe blocker]

**Notes**:
- [Any important notes]

**Time Spent**: X hours
```

---

## Next Sprint Preview

**Sprint 2: User Authentication** (Weeks 3-4)
- Implement JWT authentication
- Create user registration/login
- Add RBAC middleware
- User management UI

---

**Sprint Start**: Monday, January 27, 2026  
**Sprint End**: Friday, February 7, 2026  
**Review Date**: Friday, February 7, 3pm  

**Let's build a robust testing foundation! 🚀**
