/**
 * Integration Tests for Authentication API
 * Tests login, token validation, and authorization
 */

const request = require('supertest');

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

describe('Authentication API Integration Tests', () => {
  describe('POST /api/auth/login', () => {
    test('should login with valid credentials', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'admin123'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('admin');
    });

    test('should reject invalid credentials', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          username: 'admin',
          password: 'wrongpassword'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing username', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          password: 'admin123'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should reject missing password', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({
          username: 'admin'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken;

    beforeAll(async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      if (response.status === 200) {
        authToken = response.body.token;
      }
    });

    test('should return current user with valid token', async () => {
      if (!authToken) {
        console.warn('Skipping test - no auth token');
        return;
      }

      const response = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe('admin');
    });

    test('should reject request without token', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
    });

    test('should reject invalid token', async () => {
      const response = await request(BASE_URL)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token-here');
      
      expect(response.status).toBe(401);
    });
  });

  describe('Token Structure', () => {
    test('should return proper token structure on login', async () => {
      const response = await request(BASE_URL)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.token.length).toBeGreaterThan(20);
    });
  });

  describe('Health Check', () => {
    test('should respond to health check without authentication', async () => {
      const response = await request(BASE_URL).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.version).toBeDefined();
    });
  });
});
