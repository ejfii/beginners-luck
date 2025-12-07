const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const movesRouter = require('../routes/moves');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/moves', movesRouter);

describe('Moves API', () => {
  let authToken;
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

    // Create a negotiation
    const negotiationResponse = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Case',
        status: 'active',
        past_medical_bills: 50000,
        future_medical_bills: 25000
      });

    negotiationId = negotiationResponse.body.id;
  });

  describe('POST /api/moves', () => {
    it('should add a plaintiff demand successfully', async () => {
      const response = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 150000,
          notes: 'Opening demand'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('type', 'demand');
      expect(response.body).toHaveProperty('amount', 150000);
      expect(response.body).toHaveProperty('notes', 'Opening demand');
    });

    it('should add a defendant offer successfully', async () => {
      const response = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'defendant',
          type: 'offer',
          amount: 50000,
          notes: 'Opening offer'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('type', 'offer');
      expect(response.body).toHaveProperty('amount', 50000);
    });

    it('should reject move without auth token', async () => {
      const response = await request(app)
        .post('/api/moves')
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 150000
        });

      expect(response.status).toBe(401);
    });

    it('should reject move with invalid type', async () => {
      const response = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'invalid',
          amount: 150000
        });

      expect(response.status).toBe(400);
    });

    it('should recalculate analytics after adding move', async () => {
      // Add first move
      await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 150000
        });

      // Fetch negotiation analytics
      const negotiationResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(negotiationResponse.body.analytics).toBeDefined();
      expect(negotiationResponse.body.moves.length).toBe(1);
      expect(negotiationResponse.body.moves[0].amount).toBe(150000);
    });
  });

  describe('GET /api/moves/:negotiation_id', () => {
    beforeEach(async () => {
      // Add test moves
      await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 150000,
          notes: 'Opening demand'
        });

      await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'defendant',
          type: 'offer',
          amount: 50000,
          notes: 'Opening offer'
        });
    });

    it('should fetch all moves for a negotiation', async () => {
      const response = await request(app)
        .get(`/api/moves/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('type');
      expect(response.body[0]).toHaveProperty('amount');
    });

    it('should return empty array for negotiation with no moves', async () => {
      // Create new negotiation with no moves
      const newNegotiation = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Empty Case',
          status: 'active'
        });

      const response = await request(app)
        .get(`/api/moves/${newNegotiation.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('DELETE /api/moves/:id', () => {
    let moveId;

    beforeEach(async () => {
      const moveResponse = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 150000
        });

      moveId = moveResponse.body.id;
    });

    it('should delete a move successfully', async () => {
      const response = await request(app)
        .delete(`/api/moves/${moveId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const movesResponse = await request(app)
        .get(`/api/moves/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(movesResponse.body.length).toBe(0);
    });
  });
});
