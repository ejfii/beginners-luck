/**
 * Bracket proposal routes
 */
const express = require('express');
const db = require('../database');
const { validateBracket, sanitizeBracket } = require('../validation');
const { verifyToken } = require('../middleware/auth');
const { calculateBracketSuggestion } = require('../bracketSuggestion');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Get all bracket proposals for a negotiation
 * GET /api/negotiations/:id/brackets
 */
router.get('/:negotiation_id/brackets', (req, res) => {
  const { negotiation_id } = req.params;

  if (isNaN(negotiation_id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    db.getBracketsByNegotiationId(negotiation_id, (err, brackets) => {
      if (err) {
        console.error('Error fetching brackets:', err.message);
        return res.status(500).json({ error: 'Failed to fetch brackets' });
      }
      res.json(brackets || []);
    });
  });
});

/**
 * Create a bracket proposal
 * POST /api/negotiations/:id/brackets
 */
router.post('/:negotiation_id/brackets', (req, res) => {
  const { negotiation_id } = req.params;
  const bracketData = { ...req.body, negotiation_id: parseInt(negotiation_id) };

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validation = validateBracket(bracketData);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const sanitized = sanitizeBracket(bracketData);
    db.createBracket(sanitized, (err, result) => {
      if (err) {
        console.error('Error creating bracket:', err.message);
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json(result);
    });
  });
});
/**
 * Get bracket suggestion for a negotiation
 * POST /api/negotiations/:id/brackets/suggest
 */
router.post('/:negotiation_id/brackets/suggest', (req, res) => {
  const { negotiation_id } = req.params;

  if (isNaN(negotiation_id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get moves for this negotiation
    db.getMovesByNegotiationId(negotiation_id, (err, moves) => {
      if (err) {
        console.error('Error fetching moves for suggestion:', err.message);
        return res.status(500).json({ error: 'Failed to fetch negotiation moves' });
      }

      // Calculate suggestion
      try {
        const suggestion = calculateBracketSuggestion(negotiation, moves || []);
        res.json(suggestion);
      } catch (error) {
        console.error('Error calculating bracket suggestion:', error.message);
        return res.status(500).json({ error: 'Failed to calculate bracket suggestion' });
      }
    });
  });
});

/**
 * Update bracket status
 * PUT /api/brackets/:id
 */
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid bracket ID' });
  }

  if (!status || !['active', 'accepted', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Valid status is required (active, accepted, rejected)' });
  }

  // TODO: Verify user owns the negotiation this bracket belongs to
  // For now, updating directly
  db.updateBracket(id, { status, notes }, (err) => {
    if (err) {
      console.error('Error updating bracket:', err.message);
      return res.status(400).json({ error: err.message });
    }
    res.json({ message: 'Bracket updated successfully' });
  });
});

module.exports = router;
module.exports = router;
