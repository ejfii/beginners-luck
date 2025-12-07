const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const bracketsRouter = require('../routes/brackets');
const movesRouter = require('../routes/moves');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/negotiations', bracketsRouter);
app.use('/api/brackets', bracketsRouter);
app.use('/api/moves', movesRouter);

describe('Brackets API', () => {
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

  describe('POST /api/negotiations/:id/brackets', () => {
    it('should create a valid bracket successfully', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          notes: 'Opening bracket proposal'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('plaintiff_amount', 2000000);
      expect(response.body).toHaveProperty('defendant_amount', 750000);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should reject bracket without auth token', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000
        });

      expect(response.status).toBe(401);
    });

    it('should reject bracket with negative plaintiff amount', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: -50000,
          defendant_amount: 750000
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject bracket with negative defendant amount', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: -10000
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject bracket with missing required fields', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000
          // Missing defendant_amount
        });

      expect(response.status).toBe(400);
    });

    it('should create a plaintiff-proposed bracket', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          notes: 'Plaintiff opening bracket',
          proposed_by: 'plaintiff'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('proposed_by', 'plaintiff');
      expect(response.body).toHaveProperty('plaintiff_amount', 2000000);
      expect(response.body).toHaveProperty('defendant_amount', 750000);
    });

    it('should create a defendant-proposed bracket', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 1800000,
          defendant_amount: 800000,
          notes: 'Defendant counter-bracket',
          proposed_by: 'defendant'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('proposed_by', 'defendant');
      expect(response.body).toHaveProperty('plaintiff_amount', 1800000);
      expect(response.body).toHaveProperty('defendant_amount', 800000);
    });

    it('should default to plaintiff when proposed_by is not specified', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 1500000,
          defendant_amount: 900000,
          notes: 'Bracket without proposer specified'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('proposed_by', 'plaintiff');
    });

    it('should reject bracket with invalid proposed_by value', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          proposed_by: 'mediator' // Invalid value
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/negotiations/:id/brackets', () => {
    beforeEach(async () => {
      // Create test brackets
      await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          notes: 'First bracket'
        });

      await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 1800000,
          defendant_amount: 800000,
          notes: 'Second bracket'
        });
    });

    it('should fetch all brackets for a negotiation', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('plaintiff_amount');
      expect(response.body[0]).toHaveProperty('defendant_amount');
      expect(response.body[0]).toHaveProperty('status');
      expect(response.body[0]).toHaveProperty('proposed_by');
    });

    it('should return brackets with correct proposed_by field', async () => {
      // Create plaintiff and defendant brackets
      await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2200000,
          defendant_amount: 700000,
          proposed_by: 'plaintiff'
        });

      await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 1900000,
          defendant_amount: 850000,
          proposed_by: 'defendant'
        });

      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      const plaintiffBrackets = response.body.filter(b => b.proposed_by === 'plaintiff');
      const defendantBrackets = response.body.filter(b => b.proposed_by === 'defendant');
      
      expect(plaintiffBrackets.length).toBeGreaterThan(0);
      expect(defendantBrackets.length).toBeGreaterThan(0);
    });

    it('should return empty array for negotiation with no brackets', async () => {
      // Create new negotiation with no brackets
      const newNegotiation = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Empty Case',
          status: 'active'
        });

      const response = await request(app)
        .get(`/api/negotiations/${newNegotiation.body.id}/brackets`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe('PUT /api/brackets/:id', () => {
    let bracketId;

    beforeEach(async () => {
      const bracketResponse = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_amount: 2000000,
          defendant_amount: 750000
        });

      bracketId = bracketResponse.body.id;
    });

    it('should update bracket status successfully', async () => {
      const response = await request(app)
        .put(`/api/brackets/${bracketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'accepted'
        });

      expect(response.status).toBe(200);

      // Verify update
      const bracketsResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`);

      const updatedBracket = bracketsResponse.body.find(b => b.id === bracketId);
      expect(updatedBracket.status).toBe('accepted');
    });

    it('should update bracket to rejected status', async () => {
      const response = await request(app)
        .put(`/api/brackets/${bracketId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'rejected'
        });

      expect(response.status).toBe(200);

      // Verify update
      const bracketsResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}/brackets`)
        .set('Authorization', `Bearer ${authToken}`);

      const updatedBracket = bracketsResponse.body.find(b => b.id === bracketId);
      expect(updatedBracket.status).toBe('rejected');
    });
  });

  describe('POST /api/negotiations/:id/brackets/suggest', () => {
    it('should provide a bracket suggestion for a negotiation with no moves', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets/suggest`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('plaintiff_amount');
      expect(response.body).toHaveProperty('defendant_amount');
      expect(response.body).toHaveProperty('reasoning');
      expect(response.body.plaintiff_amount).toBeGreaterThan(0);
      expect(response.body.defendant_amount).toBeGreaterThan(0);
      expect(response.body.plaintiff_amount).toBeGreaterThan(response.body.defendant_amount);
    });

    it('should provide suggestion based on moves', async () => {
      // Add moves to the negotiation
      const move1Response = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'plaintiff',
          type: 'demand',
          amount: 2500000,
          notes: 'Initial demand'
        });
      
      expect(move1Response.status).toBe(201);

      const move2Response = await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId,
          party: 'defendant',
          type: 'offer',
          amount: 500000,
          notes: 'Initial offer'
        });
      
      expect(move2Response.status).toBe(201);

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets/suggest`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.plaintiff_amount).toBeGreaterThan(response.body.defendant_amount);
      expect(response.body.plaintiff_amount).toBeLessThanOrEqual(2500000);
      expect(response.body.defendant_amount).toBeGreaterThanOrEqual(500000);
      expect(response.body.reasoning).toContain('demand');
      expect(response.body.reasoning).toContain('offer');
    });

    it('should consider settlement goal in suggestion', async () => {
      // Update negotiation with settlement goal
      await request(app)
        .put(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          settlement_goal: 1500000
        });

      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets/suggest`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.reasoning).toContain('settlement goal');
    });

    it('should reject suggestion request without auth', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/brackets/suggest`)
        .send({});

      expect(response.status).toBe(401);
    });
  });
});
