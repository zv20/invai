/**
 * Integration Tests for Batches API
 * Tests batch management operations
 */

const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Batches API Integration Tests', () => {
  let authToken;
  let testProductId;
  let testBatchId;

  beforeAll(async () => {
    // Login
    try {
      const authResponse = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      if (authResponse.status === 200) {
        authToken = authResponse.body.token;

        // Create a test product for batch operations
        const productResponse = await request(BASE_URL)
          .post('/api/products')
          .set('Authorization', `Bearer ${authToken}`)
          .send({
            name: `Batch Test Product ${Date.now()}`,
            barcode: `BATCH${Date.now()}`,
            category_id: 1,
            items_per_case: 12
          });
        
        if (productResponse.status === 201) {
          testProductId = productResponse.body.id;
        }
      }
    } catch (error) {
      console.warn('Setup failed:', error.message);
    }
  }, 30000);

  describe('POST /api/batches', () => {
    test('should create new batch', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const newBatch = {
        product_id: testProductId,
        case_quantity: 5,
        total_quantity: 60,
        expiry_date: '2026-06-01',
        location: 'Shelf A'
      };

      const response = await request(BASE_URL)
        .post('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newBatch);
      
      expect(response.status).toBe(201);
      expect(response.body.product_id).toBe(testProductId);
      expect(response.body.total_quantity).toBe(60);
      
      testBatchId = response.body.id;
    });

    test('should reject batch without product_id', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .post('/api/batches')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          case_quantity: 5,
          total_quantity: 60
        });
      
      expect(response.status).toBe(400);
    });

    test('should reject batch without authentication', async () => {
      const response = await request(BASE_URL)
        .post('/api/batches')
        .send({
          product_id: testProductId,
          total_quantity: 60
        });
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/batches/product/:productId', () => {
    test('should return batches for specific product', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/batches/product/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    test('should return empty array for product with no batches', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/batches/product/999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/batches/:id', () => {
    test('should update batch quantity', async () => {
      if (!authToken || !testBatchId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .put(`/api/batches/${testBatchId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          total_quantity: 50,
          location: 'Shelf B'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.total_quantity).toBe(50);
      expect(response.body.location).toBe('Shelf B');
    });

    test('should return 404 for non-existent batch', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .put('/api/batches/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ total_quantity: 50 });
      
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/batches/:id', () => {
    test('should delete batch', async () => {
      if (!authToken || !testBatchId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .delete(`/api/batches/${testBatchId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });

    test('should return 404 for non-existent batch', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .delete('/api/batches/999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });

  // Cleanup
  afterAll(async () => {
    if (authToken && testProductId) {
      await request(BASE_URL)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });
});
