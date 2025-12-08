const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const analyticsRouter = require('../routes/analytics');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/analytics', analyticsRouter);

describe('Analytics API', () => {
  let authToken;
  let userId;

  beforeAll(async () => {
    await setupTestDatabase();
  });

  afterAll(() => {
    cleanupTestDatabase();
  });

  beforeEach(async () => {
    await resetTestDatabase();
    
    // Register and login
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.userId;

    // Create negotiations with different insurers
    await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Case 1 - State Farm',
        primary_insurer_name: 'State Farm',
        primary_adjuster_name: 'John Smith',
        primary_coverage_limit: 500000,
        status: 'settled'
      });

    await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Case 2 - State Farm',
        primary_insurer_name: 'State Farm',
        primary_adjuster_name: 'Jane Doe',
        primary_coverage_limit: 750000,
        status: 'active'
      });

    await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Case 3 - Progressive',
        primary_insurer_name: 'Progressive',
        primary_adjuster_name: 'John Smith',
        primary_coverage_limit: 300000,
        status: 'active'
      });
  });

  describe('GET /api/analytics/insurer/:insurerName', () => {
    it('should fetch analytics for a specific insurer', async () => {
      const response = await request(app)
        .get('/api/analytics/insurer/State%20Farm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insurerName', 'State Farm');
      expect(response.body).toHaveProperty('totalCases');
      expect(response.body).toHaveProperty('negotiations');
      expect(Array.isArray(response.body.negotiations)).toBe(true);
      expect(response.body.totalCases).toBeGreaterThanOrEqual(2);
    });

    it('should return empty result for non-existent insurer', async () => {
      const response = await request(app)
        .get('/api/analytics/insurer/NonExistent%20Insurance')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('insurerName', 'NonExistent Insurance');
      expect(response.body).toHaveProperty('totalCases', 0);
      expect(response.body.negotiations).toEqual([]);
    });

    it('should include coverage limit statistics', async () => {
      const response = await request(app)
        .get('/api/analytics/insurer/State%20Farm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalCases');
      
      // Check that negotiations include coverage limits
      const negotiations = response.body.negotiations;
      if (negotiations.length > 0) {
        expect(negotiations[0]).toHaveProperty('primary_coverage_limit');
      }
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/analytics/insurer/State%20Farm');

      expect(response.status).toBe(401);
    });

    it('should only return user\'s own negotiations', async () => {
      // Create another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          password: 'password123'
        });

      const user2Token = user2Response.body.token;

      // Create negotiation for user 2 with same insurer
      await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User 2 Case - State Farm',
          primary_insurer_name: 'State Farm',
          primary_coverage_limit: 600000
        });

      // User 1 should only see their own cases
      const response = await request(app)
        .get('/api/analytics/insurer/State%20Farm')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.totalCases).toBe(2); // Only user 1's cases
      expect(response.body.negotiations.every(n => n.user_id === userId)).toBe(true);
    });
  });

  describe('GET /api/analytics/adjuster/:adjusterName', () => {
    it('should fetch analytics for a specific adjuster', async () => {
      const response = await request(app)
        .get('/api/analytics/adjuster/John%20Smith')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('adjusterName', 'John Smith');
      expect(response.body).toHaveProperty('totalCases');
      expect(response.body).toHaveProperty('negotiations');
      expect(Array.isArray(response.body.negotiations)).toBe(true);
      expect(response.body.totalCases).toBeGreaterThanOrEqual(2);
    });

    it('should return empty result for non-existent adjuster', async () => {
      const response = await request(app)
        .get('/api/analytics/adjuster/NonExistent%20Adjuster')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('adjusterName', 'NonExistent Adjuster');
      expect(response.body).toHaveProperty('totalCases', 0);
      expect(response.body.negotiations).toEqual([]);
    });

    it('should include associated insurer information', async () => {
      const response = await request(app)
        .get('/api/analytics/adjuster/John%20Smith')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const negotiations = response.body.negotiations;
      
      if (negotiations.length > 0) {
        expect(negotiations[0]).toHaveProperty('primary_insurer_name');
        expect(negotiations[0]).toHaveProperty('primary_adjuster_name', 'John Smith');
      }
    });

    it('should reject request without authorization', async () => {
      const response = await request(app)
        .get('/api/analytics/adjuster/John%20Smith');

      expect(response.status).toBe(401);
    });

    it('should handle URL-encoded adjuster names', async () => {
      const response = await request(app)
        .get('/api/analytics/adjuster/Jane%20Doe')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('adjusterName', 'Jane Doe');
      expect(response.body.totalCases).toBeGreaterThanOrEqual(1);
    });
  });
});
