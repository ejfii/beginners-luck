const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const negotiationsRouter = require('../routes/negotiations');
const searchRouter = require('../routes/search');
const movesRouter = require('../routes/moves');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/negotiations', negotiationsRouter);
app.use('/api/search', searchRouter);
app.use('/api/moves', movesRouter);

describe('Search and Analytics API', () => {
  let authToken;
  let userId;
  let negotiationId1;
  let negotiationId2;
  let negotiationId3;

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

    // Create test negotiations
    const neg1 = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Smith v. Acme Corp',
        plaintiff_attorney: 'Attorney Johnson',
        defendant_attorney: 'Attorney Brown',
        mediator: 'Judge Wilson',
        venue: 'Superior Court',
        defendant_type: 'corporate',
        status: 'active'
      });
    negotiationId1 = neg1.body.id;

    const neg2 = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Jones v. XYZ Inc',
        plaintiff_attorney: 'Attorney Smith',
        defendant_attorney: 'Attorney Davis',
        mediator: 'Judge Taylor',
        venue: 'District Court',
        defendant_type: 'corporate',
        status: 'settled'
      });
    negotiationId2 = neg2.body.id;

    const neg3 = await request(app)
      .post('/api/negotiations')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Wilson Auto Accident',
        plaintiff_attorney: 'Attorney Johnson',
        defendant_attorney: 'Attorney Lee',
        mediator: 'Judge Martinez',
        venue: 'Superior Court',
        defendant_type: 'individual',
        status: 'active'
      });
    negotiationId3 = neg3.body.id;
  });

  describe('POST /api/search', () => {
    it('should search negotiations by case name', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Smith'
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      
      const caseNames = response.body.map(n => n.name);
      expect(caseNames.some(name => name.includes('Smith'))).toBe(true);
    });

    it('should search negotiations by attorney name', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Johnson'
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.some(n => n.plaintiff_attorney.includes('Johnson'))).toBe(true);
    });

    it('should search negotiations by mediator name', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Wilson'
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter negotiations by status', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filters: {
            status: 'active'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every(n => n.status === 'active')).toBe(true);
    });

    it('should filter negotiations by venue', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filters: {
            venue: 'Superior Court'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every(n => n.venue === 'Superior Court')).toBe(true);
    });

    it('should filter negotiations by defendant type', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          filters: {
            defendant_type: 'corporate'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
      expect(response.body.every(n => n.defendant_type === 'corporate')).toBe(true);
    });

    it('should combine query and filters', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Johnson',
          filters: {
            status: 'active',
            venue: 'Superior Court'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body.every(n => 
        n.status === 'active' && 
        n.venue === 'Superior Court' &&
        (n.plaintiff_attorney.includes('Johnson') || n.name.includes('Johnson'))
      )).toBe(true);
    });

    it('should return empty array when no matches found', async () => {
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'NonExistentCase123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });

    it('should reject search without authorization', async () => {
      const response = await request(app)
        .post('/api/search')
        .send({
          query: 'Smith'
        });

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

      // Create negotiation for user 2
      await request(app)
        .post('/api/negotiations')
        .set('Authorization', `Bearer ${user2Token}`)
        .send({
          name: 'User 2 Case - Smith'
        });

      // User 1 should only see their own cases
      const response = await request(app)
        .post('/api/search')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          query: 'Smith'
        });

      expect(response.status).toBe(200);
      expect(response.body.every(n => n.user_id === userId)).toBe(true);
    });
  });

  describe('GET /api/search/:negotiation_id (Analytics)', () => {
    beforeEach(async () => {
      // Add some moves to negotiationId1
      await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId1,
          party: 'plaintiff',
          type: 'demand',
          amount: 500000
        });

      await request(app)
        .post('/api/moves')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          negotiation_id: negotiationId1,
          party: 'defendant',
          type: 'offer',
          amount: 200000
        });
    });

    it('should fetch analytics for a negotiation', async () => {
      const response = await request(app)
        .get(`/api/search/${negotiationId1}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('lastDemand');
      expect(response.body).toHaveProperty('lastOffer');
      expect(response.body).toHaveProperty('gap');
      expect(response.body).toHaveProperty('midpoint');
    });

    it('should return 404 for non-existent negotiation', async () => {
      const response = await request(app)
        .get('/api/search/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });

    it('should reject analytics request without authorization', async () => {
      const response = await request(app)
        .get(`/api/search/${negotiationId1}`);

      expect(response.status).toBe(401);
    });

    it('should reject access to other user\'s negotiation', async () => {
      // Create another user
      const user2Response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          password: 'password123'
        });

      const user2Token = user2Response.body.token;

      // Try to access user 1's negotiation with user 2's token
      const response = await request(app)
        .get(`/api/search/${negotiationId1}`)
        .set('Authorization', `Bearer ${user2Token}`);

      expect(response.status).toBe(403);
    });

    it('should return valid analytics with multiple moves', async () => {
      const response = await request(app)
        .get(`/api/search/${negotiationId1}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.lastDemand).toBe(500000);
      expect(response.body.lastOffer).toBe(200000);
      expect(response.body.gap).toBe(300000);
      expect(response.body.midpoint).toBe(350000);
    });
  });
});
