/**
 * Moves (offers/demands) routes
 */
const express = require('express');
const db = require('../database');
const calculations = require('../calculations');
const { validateMove, sanitizeMove } = require('../validation');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Add move (offer or demand)
 * POST /api/moves
 */
router.post('/', (req, res) => {
  const { negotiation_id } = req.body;

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validation = validateMove(req.body);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const sanitized = sanitizeMove(req.body);
    db.addMove(sanitized, (err, result) => {
      if (err) {
        console.error('Error adding move:', err.message);
        return res.status(400).json({ error: err.message });
      }

      // Recalculate and save analytics
      db.getMovesByNegotiationId(sanitized.negotiation_id, (err, moves) => {
        if (!err && moves && moves.length > 0) {
          const analytics = calculations.calculateAnalytics(moves);
          db.saveCalculation({
            negotiation_id: sanitized.negotiation_id,
            move_id: result.id,
            ...analytics
          }, () => {
            res.status(201).json(result);
          });
        } else {
          res.status(201).json(result);
        }
      });
    });
  });
});

/**
 * Get moves for a negotiation
 * GET /api/moves/:negotiation_id
 */
router.get('/:negotiation_id', (req, res) => {
  const { negotiation_id } = req.params;

  if (isNaN(negotiation_id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  db.getMovesByNegotiationId(negotiation_id, (err, moves) => {
    if (err) {
      console.error('Error fetching moves:', err.message);
      return res.status(500).json({ error: 'Failed to fetch moves' });
    }
    res.json(moves || []);
  });
});

/**
 * Delete move
 * DELETE /api/moves/:id
 */
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid move ID' });
  }

  // Get the move to find its negotiation
  db.getMoveById(id, (err, move) => {
    if (err || !move) {
      return res.status(404).json({ error: 'Move not found' });
    }

    // Verify user owns the negotiation
    db.getNegotiationById(move.negotiation_id, (err, negotiation) => {
      if (err || !negotiation) {
        return res.status(404).json({ error: 'Negotiation not found' });
      }

      if (negotiation.user_id !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      db.deleteMove(id, (err) => {
        if (err) {
          console.error('Error deleting move:', err.message);
          return res.status(500).json({ error: 'Failed to delete move' });
        }
        res.json({ message: 'Move deleted successfully' });
      });
    });
  });
});

module.exports = router;
