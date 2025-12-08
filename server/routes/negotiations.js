/**
 * Negotiation routes
 */
const express = require('express');
const db = require('../database');
const calculations = require('../calculations');
const { validateNegotiationCreate, validateNegotiationUpdate, sanitizeNegotiation, sanitizeString } = require('../validation');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Create negotiation
 * POST /api/negotiations
 */
router.post('/', (req, res) => {
  const validation = validateNegotiationCreate(req.body);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  const sanitized = sanitizeNegotiation(req.body);
  sanitized.user_id = req.userId; // Add user_id from token
  
  // Extract parties from request body
  const parties = req.body.parties || [];
  
  db.createNegotiation(sanitized, (err, result) => {
    if (err) {
      console.error('Error creating negotiation:', err.message);
      return res.status(400).json({ error: err.message });
    }
    
    // If there are parties to create, create them
    if (parties.length > 0) {
      let partiesCreated = 0;
      let createdParties = [];
      
      parties.forEach(party => {
        const partyData = {
          negotiation_id: result.id,
          role: party.role,
          party_name: party.party_name.trim(),
          attorney_name: party.attorney_name ? party.attorney_name.trim() : null,
          law_firm_name: party.law_firm_name ? party.law_firm_name.trim() : null
        };
        
        db.createParty(partyData, (err, partyResult) => {
          if (!err) {
            createdParties.push(partyResult);
          }
          partiesCreated++;
          
          // When all parties are processed, return the result
          if (partiesCreated === parties.length) {
            result.parties = createdParties;
            res.status(201).json(result);
          }
        });
      });
    } else {
      // No parties to create, return the negotiation
      result.parties = [];
      res.status(201).json(result);
    }
  });
});

/**
 * Get all negotiations for current user
 * GET /api/negotiations
 */
router.get('/', (req, res) => {
  db.getAllNegotiationsByUser(req.userId, (err, negotiations) => {
    if (err) {
      console.error('Error fetching negotiations:', err.message);
      return res.status(500).json({ error: 'Failed to fetch negotiations' });
    }
    res.json(negotiations || []);
  });
});

/**
 * Get negotiation by ID with analytics
 * GET /api/negotiations/:id
 */
router.get('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  db.getNegotiationById(id, (err, negotiation) => {
    if (err) {
      console.error('Error fetching negotiation:', err.message);
      return res.status(500).json({ error: 'Failed to fetch negotiation' });
    }

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    // Verify user owns this negotiation
    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get moves and parties for this negotiation
    db.getMovesByNegotiationId(id, (err, moves) => {
      if (err) {
        console.error('Error fetching moves:', err.message);
        return res.status(500).json({ error: 'Failed to fetch moves' });
      }

      db.getPartiesByNegotiationId(id, (err, parties) => {
        if (err) {
          console.error('Error fetching parties:', err.message);
          return res.status(500).json({ error: 'Failed to fetch parties' });
        }

        const analytics = calculations.calculateAnalytics(moves || []);
        res.json({
          ...negotiation,
          moves: moves || [],
          parties: parties || [],
          analytics
        });
      });
    });
  });
});

/**
 * Update negotiation
 * PUT /api/negotiations/:id
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // First verify user owns this negotiation
  db.getNegotiationById(id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validation = validateNegotiationUpdate(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    // Don't sanitize all fields, only sanitize the ones being updated
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        updates[key] = sanitizeString(value);
      } else {
        updates[key] = value;
      }
    }

    db.updateNegotiation(id, updates, (err, result) => {
      if (err) {
        console.error('Error updating negotiation:', err.message);
        return res.status(400).json({ error: err.message });
      }
      res.json(result);
    });
  });
});

/**
 * Get recommended move for a negotiation
 * POST /api/negotiations/:id/recommend
 */
router.post('/:id/recommend', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get moves for this negotiation
    db.getMovesByNegotiationId(id, (err, moves) => {
      if (err) {
        console.error('Error fetching moves:', err.message);
        return res.status(500).json({ error: 'Failed to fetch moves' });
      }

      try {
        const recommendation = calculations.calculateRecommendedMove(negotiation, moves || []);
        res.json(recommendation);
      } catch (error) {
        console.error('Error calculating recommendation:', error.message);
        return res.status(500).json({ error: 'Failed to calculate recommendation' });
      }
    });
  });
});

/**
 * Update negotiation status
 * PATCH /api/negotiations/:id/status
 */
router.patch('/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Validate status
  const validStatuses = ['draft', 'active', 'in_mediation', 'settled', 'closed'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ 
      error: 'Invalid status', 
      validStatuses 
    });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Update the status
    const updateData = { 
      status,
      updated_date: new Date().toISOString()
    };

    db.updateNegotiation(id, updateData, (err, result) => {
      if (err) {
        console.error('Error updating negotiation status:', err.message);
        return res.status(500).json({ error: 'Failed to update status' });
      }
      res.json({ id: parseInt(id), status, updated_date: updateData.updated_date });
    });
  });
});

/**
 * Delete negotiation (soft delete)
 * DELETE /api/negotiations/:id
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // First verify user owns this negotiation
  db.getNegotiationById(id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.deleteNegotiation(id, (err) => {
      if (err) {
        console.error('Error deleting negotiation:', err.message);
        return res.status(500).json({ error: 'Failed to delete negotiation' });
      }
      res.json({ message: 'Negotiation deleted successfully' });
    });
  });
});

/**
 * Export negotiation with all related data
 * GET /api/negotiations/:id/export
 */
router.get('/:id/export', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch all related data
    db.getPartiesByNegotiationId(id, (err, parties) => {
      if (err) {
        console.error('Error fetching parties for export:', err.message);
        return res.status(500).json({ error: 'Failed to export negotiation data' });
      }

      db.getMovesByNegotiationId(id, (err, moves) => {
        if (err) {
          console.error('Error fetching moves for export:', err.message);
          return res.status(500).json({ error: 'Failed to export negotiation data' });
        }

        db.getBracketsByNegotiationId(id, (err, brackets) => {
          if (err) {
            console.error('Error fetching brackets for export:', err.message);
            return res.status(500).json({ error: 'Failed to export negotiation data' });
          }

          db.getMediatorProposal(id, (err, mediatorProposal) => {
            if (err) {
              console.error('Error fetching mediator proposal for export:', err.message);
              return res.status(500).json({ error: 'Failed to export negotiation data' });
            }

            // Return complete negotiation export
            res.json({
              negotiation,
              parties: parties || [],
              moves: moves || [],
              brackets: brackets || [],
              mediatorProposal: mediatorProposal || null
            });
          });
        });
      });
    });
  });
});

module.exports = router;
