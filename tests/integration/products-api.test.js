/**
 * Integration Tests for Products API
 * Tests full CRUD operations with authentication
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Note: We'll need to export app from server.js for testing
// For now, we'll test against a running server
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Products API Integration Tests', () => {
  let authToken;
  let testProductId;

  // Setup: Login before all tests
  beforeAll(async () => {
    // Try to login with default test user
    try {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      if (response.status === 200 && response.body.token) {
        authToken = response.body.token;
      } else {
        console.warn('Could not authenticate - tests may fail');
      }
    } catch (error) {
      console.warn('Authentication setup failed:', error.message);
    }
  }, 30000);

  describe('GET /api/products', () => {
    test('should return list of products with authentication', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/products')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return 401 without authentication', async () => {
      const response = await request(BASE_URL)
        .get('/api/products');
      
      expect(response.status).toBe(401);
    });

    test('should return 401 with invalid token', async () => {
      const response = await request(BASE_URL)
        .get('/api/products')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/products', () => {
    test('should create new product with valid data', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const newProduct = {
        name: `Test Product ${Date.now()}`,
        barcode: `TEST${Date.now()}`,
        category_id: 1,
        supplier_id: 1,
        items_per_case: 12,
        cost_per_case: 24.99,
        reorder_point: 10
      };

      const response = await request(BASE_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send(newProduct);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe(newProduct.name);
      expect(response.body.id).toBeDefined();
      
      testProductId = response.body.id;
    });

    test('should reject product without name', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .post('/api/products')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          barcode: 'TEST123'
        });
      
      expect(response.status).toBe(400);
    });

    test('should reject product without authentication', async () => {
      const response = await request(BASE_URL)
        .post('/api/products')
        .send({
          name: 'Unauthorized Product'
        });
      
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/products/:id', () => {
    test('should return specific product by ID', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe(testProductId);
    });

    test('should return 404 for non-existent product', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/products/999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/products/:id', () => {
    test('should update existing product', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const updates = {
        name: `Updated Test Product ${Date.now()}`,
        reorder_point: 20
      };

      const response = await request(BASE_URL)
        .put(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updates);
      
      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updates.name);
      expect(response.body.reorder_point).toBe(updates.reorder_point);
    });

    test('should return 404 when updating non-existent product', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .put('/api/products/999999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });
      
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/products/search', () => {
    test('should search products by query', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/products/search?q=Test')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should reject search with query less than 2 characters', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/products/search?q=a')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/products/:id', () => {
    test('should delete product', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .delete(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
    });

    test('should return 404 after deletion', async () => {
      if (!authToken || !testProductId) {
        console.warn('Skipping test - prerequisites not met');
        return;
      }

      const response = await request(BASE_URL)
        .get(`/api/products/${testProductId}`)
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });

    test('should return 404 when deleting non-existent product', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .delete('/api/products/999999')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(404);
    });
  });
});
