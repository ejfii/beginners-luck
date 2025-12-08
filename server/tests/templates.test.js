const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const authRouter = require('../routes/auth');
const templatesRouter = require('../routes/templates');
const { setupTestDatabase, cleanupTestDatabase, resetTestDatabase } = require('./helpers');

// Create a minimal Express app for testing
const app = express();
app.use(bodyParser.json());
app.use('/api/auth', authRouter);
app.use('/api/templates', templatesRouter);

describe('Templates API', () => {
  let authToken;
  let userId;
  let templateId;

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
  });

  describe('POST /api/templates', () => {
    it('should create a template successfully', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Auto Accident Template',
          description: 'Standard template for auto accident cases',
          template_data: {
            plaintiff_attorney: 'Default Plaintiff Attorney',
            defendant_attorney: 'Default Defense Attorney',
            mediator: 'Judge Smith',
            venue: 'Superior Court',
            defendant_type: 'individual'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Auto Accident Template');
      expect(response.body).toHaveProperty('user_id', userId);
      expect(response.body).toHaveProperty('description', 'Standard template for auto accident cases');
    });

    it('should reject template creation without name', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          description: 'Template without name',
          template_data: {}
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should reject template creation without authorization', async () => {
      const response = await request(app)
        .post('/api/templates')
        .send({
          name: 'Unauthorized Template',
          template_data: {}
        });

      expect(response.status).toBe(401);
    });

    it('should create template with insurance coverage fields', async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Insurance Coverage Template',
          template_data: {
            primary_coverage_limit: 500000,
            primary_insurer_name: 'State Farm',
            primary_adjuster_name: 'John Adjuster',
            umbrella_coverage_limit: 1000000,
            umbrella_insurer_name: 'Progressive',
            umbrella_adjuster_name: 'Jane Adjuster'
          }
        });

      expect(response.status).toBe(201);
      expect(response.body.template_data).toHaveProperty('primary_coverage_limit', 500000);
      expect(response.body.template_data).toHaveProperty('umbrella_coverage_limit', 1000000);
    });
  });

  describe('GET /api/templates', () => {
    beforeEach(async () => {
      // Create a few templates
      const template1 = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template 1',
          description: 'First template',
          template_data: {}
        });

      templateId = template1.body.id;

      await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template 2',
          description: 'Second template',
          template_data: {}
        });
    });

    it('should fetch all templates for the user', async () => {
      const response = await request(app)
        .get('/api/templates')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThanOrEqual(2);
    });

    it('should reject fetching templates without authorization', async () => {
      const response = await request(app)
        .get('/api/templates');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/templates/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Single Template',
          description: 'Template for single fetch test',
          template_data: {}
        });
      
      templateId = response.body.id;
    });

    it('should fetch a single template by id', async () => {
      const response = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('id', templateId);
      expect(response.body).toHaveProperty('name', 'Single Template');
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .get('/api/templates/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/templates/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Original Template',
          description: 'Original description',
          template_data: {}
        });
      
      templateId = response.body.id;
    });

    it('should update a template successfully', async () => {
      const response = await request(app)
        .put(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Template',
          description: 'Updated description',
          mediator: 'New Mediator'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Updated Template');
      expect(response.body).toHaveProperty('description', 'Updated description');
      expect(response.body).toHaveProperty('mediator', 'New Mediator');
    });

    it('should return 404 when updating non-existent template', async () => {
      const response = await request(app)
        .put('/api/templates/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Template'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/templates/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template to Delete',
          template_data: {}
        });
      
      templateId = response.body.id;
    });

    it('should delete a template successfully', async () => {
      const response = await request(app)
        .delete(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Template deleted successfully');

      // Verify template is deleted
      const getResponse = await request(app)
        .get(`/api/templates/${templateId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 when deleting non-existent template', async () => {
      const response = await request(app)
        .delete('/api/templates/99999')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/templates/:id/create-negotiation', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/templates')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Template for Negotiation',
          template_data: {
            plaintiff_attorney: 'Attorney A',
            defendant_attorney: 'Attorney B',
            mediator: 'Mediator C',
            venue: 'Court D',
            primary_coverage_limit: 250000
          }
        });
      
      templateId = response.body.id;
    });

    it('should create a negotiation from template', async () => {
      const response = await request(app)
        .post(`/api/templates/${templateId}/create-negotiation`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'New Case from Template'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'New Case from Template');
      expect(response.body).toHaveProperty('plaintiff_attorney', 'Attorney A');
      expect(response.body).toHaveProperty('defendant_attorney', 'Attorney B');
      expect(response.body).toHaveProperty('mediator', 'Mediator C');
      expect(response.body).toHaveProperty('primary_coverage_limit', 250000);
    });

    it('should return 404 for non-existent template', async () => {
      const response = await request(app)
        .post('/api/templates/99999/create-negotiation')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Case from Non-existent Template'
        });

      expect(response.status).toBe(404);
    });
  });
});
