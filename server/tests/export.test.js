const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);

describe('Export Endpoint Tests', () => {
  let authToken;
  let userId;
  let negotiationId;

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

    // Create a negotiation
    const negotiationResponse = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Export Test Case',
        status: 'active'
      });
    
    negotiationId = negotiationResponse.body.id;
  });

  describe('GET /api/negotiations/:id/export', () => {
    it('should export negotiation data with correct structure', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/export`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('negotiation');
      expect(response.body).toHaveProperty('parties');
      expect(response.body).toHaveProperty('moves');
      expect(response.body).toHaveProperty('brackets');
      expect(response.body).toHaveProperty('mediatorProposal');
    });

    it('should include negotiation details', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/export`)
        .set('Authorization', `Bearer ${authToken}`);

      const { negotiation } = response.body;
      expect(negotiation).toHaveProperty('id', negotiationId);
      expect(negotiation).toHaveProperty('name', 'Export Test Case');
      expect(negotiation).toHaveProperty('user_id', userId);
    });

    it('should return empty arrays for a minimal negotiation', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/export`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.body.parties).toEqual([]);
      expect(response.body.moves).toEqual([]);
      expect(response.body.brackets).toEqual([]);
      expect(response.body.mediatorProposal).toBeNull();
    });

    it('should reject export without authorization', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/export`);

      expect(response.status).toBe(401);
    });

    it('should return 404 for non-existent negotiation', async () => {
      const response = await request(app)
        .get('/api/negotiations/99999/export')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});
