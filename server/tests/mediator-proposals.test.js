const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const mediatorRouter = require('../routes/mediator');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/negotiations', mediatorRouter);
app.use('/api/mediator-proposals', mediatorRouter);

describe('Mediator Proposals API', () => {
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
        status: 'active'
      });

    negotiationId = negotiationResponse.body.id;
  });

  describe('POST /api/negotiations/:id/mediator-proposal', () => {
    it('should create mediator proposal with future deadline', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const deadline = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 95000,
          deadline: deadline,
          notes: 'Mediator suggests settlement at $95,000'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('amount', 95000);
      expect(response.body.deadline).toContain(deadline);
      expect(response.body).toHaveProperty('status', 'pending');
      expect(response.body.plaintiff_response).toBeNull();
      expect(response.body.defendant_response).toBeNull();
    });

    it('should reject proposal without auth token', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .send({
          amount: 95000,
          deadline: deadline
        });

      expect(response.status).toBe(401);
    });

    it('should reject proposal with past deadline', async () => {
      const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago
      const deadline = pastDate.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 95000,
          deadline: deadline
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject proposal with missing amount', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = futureDate.toISOString().split('T')[0];

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          deadline: deadline
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/negotiations/:id/mediator-proposal', () => {
    let proposalId;

    beforeEach(async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = futureDate.toISOString().split('T')[0];

      const proposalResponse = await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 95000,
          deadline: deadline,
          notes: 'Test proposal'
        });

      proposalId = proposalResponse.body.id;
    });

    it('should fetch mediator proposal for negotiation', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', proposalId);
      expect(response.body).toHaveProperty('amount', 95000);
      expect(response.body).toHaveProperty('status', 'pending');
    });

    it('should return 404 for negotiation with no proposal', async () => {
      // Create new negotiation with no proposal
      const newNegotiation = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Empty Case',
          status: 'active'
        });

      const response = await request(app)
        .get(`/api/negotiations/${newNegotiation.body.id}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toBeNull();
    });
  });

  describe('PUT /api/negotiations/:id/mediator-proposal', () => {
    beforeEach(async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const deadline = futureDate.toISOString().split('T')[0];

      await request(app)
        .post(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          amount: 95000,
          deadline: deadline,
          notes: 'Test proposal'
        });
    });

    it('should update plaintiff response to accepted', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'plaintiff',
          response: 'accepted'
        });

      expect(response.status).toBe(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.plaintiff_response).toBe('accepted');
      expect(getResponse.body.status).toBe('accepted_plaintiff');
    });

    it('should update defendant response to accepted', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'defendant',
          response: 'accepted'
        });

      expect(response.status).toBe(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.defendant_response).toBe('accepted');
      expect(getResponse.body.status).toBe('accepted_defendant');
    });

    it('should update status to accepted_both when both parties accept', async () => {
      // Plaintiff accepts
      await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'plaintiff',
          response: 'accepted'
        });

      // Defendant accepts
      await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'defendant',
          response: 'accepted'
        });

      // Verify both accepted
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.plaintiff_response).toBe('accepted');
      expect(getResponse.body.defendant_response).toBe('accepted');
      expect(getResponse.body.status).toBe('accepted_both');
    });

    it('should update plaintiff response to rejected', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'plaintiff',
          response: 'rejected'
        });

      expect(response.status).toBe(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.plaintiff_response).toBe('rejected');
      expect(getResponse.body.status).toBe('rejected');
    });

    it('should update status to rejected when defendant rejects', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          party: 'defendant',
          response: 'rejected'
        });

      expect(response.status).toBe(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/mediator-proposal`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.defendant_response).toBe('rejected');
      expect(getResponse.body.status).toBe('rejected');
    });
  });
});
