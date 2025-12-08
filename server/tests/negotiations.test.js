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

describe('Negotiations API', () => {
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
    
    // Register and login to get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.userId;
  });

  describe('POST /api/negotiations', () => {
    it('should create a negotiation successfully', async () => {
      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Smith v. Acme Corp',
          plaintiff_attorney: 'John Doe',
          defendant_attorney: 'Jane Smith',
          mediator: 'Judge Brown',
          venue: 'Superior Court',
          status: 'active'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Smith v. Acme Corp');
      expect(response.body).toHaveProperty('user_id', userId);
      expect(response.body).toHaveProperty('status', 'active');
    });

    it('should reject negotiation without auth token', async () => {
      const response = await request(app)
        .post('/api/negotiations')
        .send({
          name: 'Smith v. Acme Corp'
        });

      expect(response.status).toBe(401);
    });

    it('should reject negotiation without name', async () => {
      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          plaintiff_attorney: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should create negotiation with insurance coverage fields', async () => {
      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Insurance Test Case',
          primary_coverage_limit: 250000,
          primary_insurer_name: 'State Farm',
          primary_adjuster_name: 'John Adjuster',
          umbrella_coverage_limit: 1000000,
          umbrella_insurer_name: 'Liberty Mutual',
          umbrella_adjuster_name: 'Jane Umbrella',
          uim_coverage_limit: 100000,
          uim_insurer_name: 'Progressive',
          uim_adjuster_name: 'Bob UIM'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('primary_coverage_limit', 250000);
      expect(response.body).toHaveProperty('primary_insurer_name', 'State Farm');
      expect(response.body).toHaveProperty('primary_adjuster_name', 'John Adjuster');
      expect(response.body).toHaveProperty('umbrella_coverage_limit', 1000000);
      expect(response.body).toHaveProperty('umbrella_insurer_name', 'Liberty Mutual');
      expect(response.body).toHaveProperty('umbrella_adjuster_name', 'Jane Umbrella');
      expect(response.body).toHaveProperty('uim_coverage_limit', 100000);
      expect(response.body).toHaveProperty('uim_insurer_name', 'Progressive');
      expect(response.body).toHaveProperty('uim_adjuster_name', 'Bob UIM');
    });

    it('should reject invalid coverage limit values', async () => {
      const response = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Coverage Test',
          primary_coverage_limit: 'not-a-number'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/negotiations', () => {
    beforeEach(async () => {
      // Create test negotiations
      await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Case 1',
          status: 'active'
        });

      await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Case 2',
          status: 'settled'
        });
    });

    it('should fetch list of negotiations for authenticated user', async () => {
      const response = await request(app)
        .get('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('name');
      expect(response.body[0]).toHaveProperty('status');
    });

    it('should reject request without auth token', async () => {
      const response = await request(app)
        .get('/api/negotiations');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/negotiations/:id', () => {
    let negotiationId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Case',
          status: 'active',
          past_medical_bills: 50000,
          future_medical_bills: 25000
        });

      negotiationId = createResponse.body.id;
    });

    it('should fetch single negotiation with moves and analytics', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', negotiationId);
      expect(response.body).toHaveProperty('name', 'Test Case');
      expect(response.body).toHaveProperty('moves');
      expect(Array.isArray(response.body.moves)).toBe(true);
      expect(response.body).toHaveProperty('analytics');
    });

    it('should return 404 for non-existent negotiation', async () => {
      const response = await request(app)
        .get('/api/negotiations/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/negotiations/:id', () => {
    let negotiationId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Case',
          status: 'active'
        });

      negotiationId = createResponse.body.id;
    });

    it('should update negotiation successfully', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          status: 'settled',
          settlement_goal: 100000
        });

      expect(response.status).toBe(200);

      // Verify update
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.status).toBe('settled');
      expect(getResponse.body.settlement_goal).toBe(100000);
    });

    it('should update jury_damages_likelihood successfully', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jury_damages_likelihood: 75
        });

      expect(response.status).toBe(200);

      // Verify the field persists
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.body.jury_damages_likelihood).toBe(75);
    });

    it('should reject jury_damages_likelihood above 100', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jury_damages_likelihood: 150
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveProperty('jury_damages_likelihood');
    });

    it('should reject negative jury_damages_likelihood', async () => {
      const response = await request(app)
        .put(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          jury_damages_likelihood: -10
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toHaveProperty('jury_damages_likelihood');
    });
  });

  describe('DELETE /api/negotiations/:id', () => {
    let negotiationId;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Case',
          status: 'active'
        });

      negotiationId = createResponse.body.id;
    });

    it('should delete negotiation successfully', async () => {
      const response = await request(app)
        .delete(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);

      // Verify deletion
      const getResponse = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });
  });
});
