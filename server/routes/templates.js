/**
 * Templates routes - Save and reuse negotiation configurations
 */
const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const { validateStringLength, validateRequired, VALIDATION_CONSTANTS } = require('../validation');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Create a new template from negotiation data
 * POST /api/templates
 */
router.post('/', (req, res) => {
  const { name, description, template_data } = req.body;

  // Validation
  const errors = {};
  
  if (!name || typeof name !== 'string' || name.trim() === '') {
    errors.name = 'Template name is required';
  } else if (name.length > VALIDATION_CONSTANTS.MAX_STRING_LENGTH) {
    errors.name = `Template name must be less than ${VALIDATION_CONSTANTS.MAX_STRING_LENGTH} characters`;
  }

  if (description && description.length > VALIDATION_CONSTANTS.MAX_LONG_TEXT_LENGTH) {
    errors.description = `Description must be less than ${VALIDATION_CONSTANTS.MAX_LONG_TEXT_LENGTH} characters`;
  }

  if (!template_data || typeof template_data !== 'object') {
    errors.template_data = 'Template data is required and must be an object';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const templateData = {
    user_id: req.userId,
    name: name.trim(),
    description: description ? description.trim() : null,
    template_data
  };

  db.createTemplate(templateData, (err, result) => {
    if (err) {
      console.error('Error creating template:', err.message);
      return res.status(500).json({ error: 'Failed to create template' });
    }
    res.status(201).json(result);
  });
});

/**
 * Get all templates for the authenticated user
 * GET /api/templates
 */
router.get('/', (req, res) => {
  db.getTemplatesByUser(req.userId, (err, templates) => {
    if (err) {
      console.error('Error fetching templates:', err.message);
      return res.status(500).json({ error: 'Failed to fetch templates' });
    }
    res.json(templates);
  });
});

/**
 * Get a specific template by ID
 * GET /api/templates/:id
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  db.getTemplateById(id, req.userId, (err, template) => {
    if (err) {
      console.error('Error fetching template:', err.message);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  });
});

/**
 * Update a template
 * PUT /api/templates/:id
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, description, template_data } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  // Validation
  const errors = {};
  
  if (name !== undefined) {
    if (typeof name !== 'string' || name.trim() === '') {
      errors.name = 'Template name cannot be empty';
    } else if (name.length > VALIDATION_CONSTANTS.MAX_STRING_LENGTH) {
      errors.name = `Template name must be less than ${VALIDATION_CONSTANTS.MAX_STRING_LENGTH} characters`;
    }
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      errors.description = 'Description must be a string';
    } else if (description.length > VALIDATION_CONSTANTS.MAX_LONG_TEXT_LENGTH) {
      errors.description = `Description must be less than ${VALIDATION_CONSTANTS.MAX_LONG_TEXT_LENGTH} characters`;
    }
  }

  if (template_data !== undefined && typeof template_data !== 'object') {
    errors.template_data = 'Template data must be an object';
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description ? description.trim() : null;
  if (template_data !== undefined) updates.template_data = template_data;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  db.updateTemplate(id, req.userId, updates, (err, result) => {
    if (err) {
      console.error('Error updating template:', err.message);
      return res.status(500).json({ error: 'Failed to update template' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json({ message: 'Template updated successfully' });
  });
});

/**
 * Delete a template
 * DELETE /api/templates/:id
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  db.deleteTemplate(id, req.userId, (err, result) => {
    if (err) {
      console.error('Error deleting template:', err.message);
      return res.status(500).json({ error: 'Failed to delete template' });
    }

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Template not found or unauthorized' });
    }

    res.json({ message: 'Template deleted successfully' });
  });
});

/**
 * Create a new negotiation from a template
 * POST /api/templates/:id/create-negotiation
 */
router.post('/:id/create-negotiation', (req, res) => {
  const { id } = req.params;
  const { case_name } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  if (!case_name || typeof case_name !== 'string' || case_name.trim() === '') {
    return res.status(400).json({ error: 'Case name is required' });
  }

  // Get the template
  db.getTemplateById(id, req.userId, (err, template) => {
    if (err) {
      console.error('Error fetching template:', err.message);
      return res.status(500).json({ error: 'Failed to fetch template' });
    }

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Create negotiation with template data
    const negotiationData = {
      ...template.template_data,
      name: case_name.trim(),
      user_id: req.userId
    };

    db.createNegotiation(negotiationData, (err, result) => {
      if (err) {
        console.error('Error creating negotiation from template:', err.message);
        return res.status(500).json({ error: 'Failed to create negotiation from template' });
      }

      // If template includes parties, create them
      if (template.template_data.parties && Array.isArray(template.template_data.parties)) {
        let partiesCreated = 0;
        const parties = template.template_data.parties;

        parties.forEach(party => {
          const partyData = {
            negotiation_id: result.id,
            role: party.role,
            party_name: party.party_name,
            attorney_name: party.attorney_name || null,
            law_firm_name: party.law_firm_name || null
          };

          db.createParty(partyData, (err) => {
            if (err) {
              console.error('Error creating party from template:', err.message);
            }
            partiesCreated++;

            // Once all parties are processed, return the result
            if (partiesCreated === parties.length) {
              res.status(201).json(result);
            }
          });
        });
      } else {
        res.status(201).json(result);
      }
    });
  });
});

module.exports = router;
