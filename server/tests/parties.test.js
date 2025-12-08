const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const partiesRouter = require('../routes/parties');
const negotiationsRouter = require('../routes/negotiations');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api', partiesRouter);
app.use('/api/negotiations', negotiationsRouter);

describe('Parties API', () => {
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
    
    // Register and login to get auth token
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        password: 'password123'
      });
    
    authToken = registerResponse.body.token;
    userId = registerResponse.body.userId;

    // Create a test negotiation
    const negotiationResponse = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Test Case',
        plaintiff_attorney: 'Attorney Smith',
        defendant_attorney: 'Attorney Jones'
      });
    
    negotiationId = negotiationResponse.body.id;
  });

  describe('POST /api/negotiations/:negotiationId/parties', () => {
    it('should create a plaintiff party successfully', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          party_name: 'John Doe',
          attorney_name: 'Attorney Smith',
          law_firm_name: 'Smith & Associates'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('role', 'plaintiff');
      expect(response.body).toHaveProperty('party_name', 'John Doe');
      expect(response.body).toHaveProperty('attorney_name', 'Attorney Smith');
      expect(response.body).toHaveProperty('law_firm_name', 'Smith &amp; Associates');
    });

    it('should create a defendant party successfully', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'defendant',
          party_name: 'Acme Corporation',
          attorney_name: 'Attorney Jones',
          law_firm_name: 'Jones Legal Group'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('role', 'defendant');
      expect(response.body).toHaveProperty('party_name', 'Acme Corporation');
    });

    it('should create multiple plaintiffs and defendants', async () => {
      // Create first plaintiff
      const plaintiff1 = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          party_name: 'Jane Smith',
          attorney_name: 'Attorney A',
          law_firm_name: 'Firm A'
        });

      // Create second plaintiff
      const plaintiff2 = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          party_name: 'Bob Johnson',
          attorney_name: 'Attorney A',
          law_firm_name: 'Firm A'
        });

      // Create first defendant
      const defendant1 = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'defendant',
          party_name: 'Company X',
          attorney_name: 'Attorney B',
          law_firm_name: 'Firm B'
        });

      // Create second defendant
      const defendant2 = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'defendant',
          party_name: 'Company Y',
          attorney_name: 'Attorney B',
          law_firm_name: 'Firm B'
        });

      expect(plaintiff1.status).toBe(201);
      expect(plaintiff2.status).toBe(201);
      expect(defendant1.status).toBe(201);
      expect(defendant2.status).toBe(201);

      // Verify all parties are associated with the negotiation
      const negotiation = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(negotiation.body.parties).toHaveLength(4);
      
      const plaintiffs = negotiation.body.parties.filter(p => p.role === 'plaintiff');
      const defendants = negotiation.body.parties.filter(p => p.role === 'defendant');
      
      expect(plaintiffs).toHaveLength(2);
      expect(defendants).toHaveLength(2);
    });

    it('should reject party creation without party_name', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          attorney_name: 'Attorney Smith'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject party creation with invalid role', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'invalid_type',
          party_name: 'John Doe'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject party creation without authorization', async () => {
      const response = await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .send({
          role: 'plaintiff',
          party_name: 'John Doe'
        });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/negotiations/:negotiationId/parties', () => {
    beforeEach(async () => {
      // Create some test parties
      await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          party_name: 'Plaintiff One',
          attorney_name: 'Attorney A'
        });

      await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'defendant',
          party_name: 'Defendant One',
          attorney_name: 'Attorney B'
        });
    });

    it('should fetch all parties for a negotiation', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should group parties correctly by type', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`);

      const plaintiffs = response.body.filter(p => p.role === 'plaintiff');
      const defendants = response.body.filter(p => p.role === 'defendant');

      expect(plaintiffs).toHaveLength(1);
      expect(defendants).toHaveLength(1);
      expect(plaintiffs[0].party_name).toBe('Plaintiff One');
      expect(defendants[0].party_name).toBe('Defendant One');
    });
  });

  describe('GET /api/negotiations/:id - Include parties in negotiation detail', () => {
    beforeEach(async () => {
      // Create test parties with attorney information
      await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'plaintiff',
          party_name: 'John Doe',
          attorney_name: 'Jane Smith',
          law_firm_name: 'Smith & Associates'
        });

      await request(app)
        .post(`/api/negotiations/${negotiationId}/parties`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          role: 'defendant',
          party_name: 'ABC Corporation',
          attorney_name: 'Bob Johnson',
          law_firm_name: 'Johnson Law Firm'
        });
    });

    it('should include parties with attorney info in negotiation detail response', async () => {
      const response = await request(app)
        .get(`/api/negotiations/${negotiationId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('parties');
      expect(Array.isArray(response.body.parties)).toBe(true);
      expect(response.body.parties).toHaveLength(2);

      // Check plaintiff party
      const plaintiff = response.body.parties.find(p => p.role === 'plaintiff');
      expect(plaintiff).toBeDefined();
      expect(plaintiff.party_name).toBe('John Doe');
      expect(plaintiff.attorney_name).toBe('Jane Smith');
      expect(plaintiff.law_firm_name).toBe('Smith &amp; Associates');

      // Check defendant party
      const defendant = response.body.parties.find(p => p.role === 'defendant');
      expect(defendant).toBeDefined();
      expect(defendant.party_name).toBe('ABC Corporation');
      expect(defendant.attorney_name).toBe('Bob Johnson');
      expect(defendant.law_firm_name).toBe('Johnson Law Firm');
    });
  });
});
