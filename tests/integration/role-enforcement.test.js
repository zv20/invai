/**
 * Integration Tests for RBAC Role Enforcement
 * Tests permission enforcement on actual API endpoints
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// Import test database setup
const { setupTestDb, cleanupTestDb } = require('../helpers/db-helper');

describe('RBAC Role Enforcement - Integration Tests', () => {
  let app;
  let testDb;
  let tokens = {};
  let testProductId;
  let testBatchId;

  // Generate JWT tokens for each role
  beforeAll(async () => {
    const testEnv = await setupTestDb();
    app = testEnv.app;
    testDb = testEnv.db;

    // Create test users for each role
    const roles = ['owner', 'manager', 'staff', 'viewer'];
    for (const role of roles) {
      tokens[role] = jwt.sign(
        { id: Math.floor(Math.random() * 1000), username: `test_${role}`, role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
    }

    // Create a test product for testing
    const productRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${tokens.owner}`)
      .send({
        name: 'Test Product for RBAC',
        inhouse_number: 'RBAC-001',
        items_per_case: 12,
        cost_per_case: 24.99
      });
    testProductId = productRes.body.id;

    // Create a test batch
    const batchRes = await request(app)
      .post('/api/batches')
      .set('Authorization', `Bearer ${tokens.owner}`)
      .send({
        product_id: testProductId,
        case_quantity: 10,
        expiry_date: '2026-12-31',
        location: 'A1'
      });
    testBatchId = batchRes.body.id;
  });

  afterAll(async () => {
    await cleanupTestDb();
  });

  describe('Product Permissions', () => {
    describe('View Products (all roles)', () => {
      test('owner can view products', async () => {
        const res = await request(app)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
      });

      test('manager can view products', async () => {
        const res = await request(app)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff can view products', async () => {
        const res = await request(app)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(200);
      });

      test('viewer can view products', async () => {
        const res = await request(app)
          .get('/api/products')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(200);
      });

      test('unauthenticated request is rejected', async () => {
        const res = await request(app).get('/api/products');
        expect(res.statusCode).toBe(401);
        expect(res.body.error.code).toBe('AUTH_REQUIRED');
      });
    });

    describe('Create Products (owner, manager, staff)', () => {
      test('owner can create products', async () => {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({ name: 'Owner Product', items_per_case: 6 });
        expect(res.statusCode).toBe(201);
        expect(res.body.name).toBe('Owner Product');
      });

      test('manager can create products', async () => {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.manager}`)
          .send({ name: 'Manager Product', items_per_case: 12 });
        expect(res.statusCode).toBe(201);
      });

      test('staff can create products', async () => {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({ name: 'Staff Product', items_per_case: 24 });
        expect(res.statusCode).toBe(201);
      });

      test('viewer CANNOT create products', async () => {
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({ name: 'Viewer Product', items_per_case: 6 });
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });
    });

    describe('Delete Products (owner, manager only)', () => {
      let productToDelete;

      beforeEach(async () => {
        // Create a product to delete
        const res = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({ name: 'Delete Test Product', items_per_case: 1 });
        productToDelete = res.body.id;
      });

      test('owner can delete products', async () => {
        const res = await request(app)
          .delete(`/api/products/${productToDelete}`)
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.message).toContain('deleted');
      });

      test('manager can delete products', async () => {
        // Create another product
        const createRes = await request(app)
          .post('/api/products')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({ name: 'Manager Delete Test', items_per_case: 1 });
        
        const res = await request(app)
          .delete(`/api/products/${createRes.body.id}`)
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff CANNOT delete products', async () => {
        const res = await request(app)
          .delete(`/api/products/${productToDelete}`)
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      test('viewer CANNOT delete products', async () => {
        const res = await request(app)
          .delete(`/api/products/${productToDelete}`)
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });
    });
  });

  describe('Batch Permissions', () => {
    describe('View Batches (all roles)', () => {
      test('all roles can view batches', async () => {
        for (const role of ['owner', 'manager', 'staff', 'viewer']) {
          const res = await request(app)
            .get(`/api/batches/${testBatchId}`)
            .set('Authorization', `Bearer ${tokens[role]}`);
          expect(res.statusCode).toBe(200);
        }
      });
    });

    describe('Create Batches (owner, manager, staff)', () => {
      test('viewer CANNOT create batches', async () => {
        const res = await request(app)
          .post('/api/batches')
          .set('Authorization', `Bearer ${tokens.viewer}`)
          .send({
            product_id: testProductId,
            case_quantity: 5,
            location: 'B1'
          });
        expect(res.statusCode).toBe(403);
      });

      test('staff CAN create batches', async () => {
        const res = await request(app)
          .post('/api/batches')
          .set('Authorization', `Bearer ${tokens.staff}`)
          .send({
            product_id: testProductId,
            case_quantity: 5,
            location: 'C1'
          });
        expect(res.statusCode).toBe(201);
      });
    });

    describe('Delete Batches (owner, manager only)', () => {
      test('staff CANNOT delete batches', async () => {
        const res = await request(app)
          .delete(`/api/batches/${testBatchId}`)
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
      });

      test('manager CAN delete batches', async () => {
        // Create a batch to delete
        const createRes = await request(app)
          .post('/api/batches')
          .set('Authorization', `Bearer ${tokens.owner}`)
          .send({
            product_id: testProductId,
            case_quantity: 1,
            location: 'D1'
          });

        const res = await request(app)
          .delete(`/api/batches/${createRes.body.id}`)
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });
    });
  });

  describe('Report Permissions', () => {
    describe('Basic Reports (all roles)', () => {
      test('all roles can view expiration report', async () => {
        for (const role of ['owner', 'manager', 'staff', 'viewer']) {
          const res = await request(app)
            .get('/api/reports/expiration')
            .set('Authorization', `Bearer ${tokens[role]}`);
          expect(res.statusCode).toBe(200);
        }
      });

      test('all roles can view low-stock report', async () => {
        const res = await request(app)
          .get('/api/reports/low-stock')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(200);
      });
    });

    describe('Cost Reports (owner, manager only)', () => {
      test('owner can view stock-value report', async () => {
        const res = await request(app)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
      });

      test('manager can view stock-value report', async () => {
        const res = await request(app)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff CANNOT view stock-value report', async () => {
        const res = await request(app)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      });

      test('viewer CANNOT view stock-value report', async () => {
        const res = await request(app)
          .get('/api/reports/stock-value')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });
    });

    describe('Export Reports (owner, manager only)', () => {
      test('owner can export reports', async () => {
        const res = await request(app)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.owner}`);
        expect(res.statusCode).toBe(200);
        expect(res.headers['content-type']).toContain('text/csv');
      });

      test('manager can export reports', async () => {
        const res = await request(app)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.manager}`);
        expect(res.statusCode).toBe(200);
      });

      test('staff CANNOT export reports', async () => {
        const res = await request(app)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.staff}`);
        expect(res.statusCode).toBe(403);
      });

      test('viewer CANNOT export reports', async () => {
        const res = await request(app)
          .get('/api/reports/export/products')
          .set('Authorization', `Bearer ${tokens.viewer}`);
        expect(res.statusCode).toBe(403);
      });
    });
  });
});
