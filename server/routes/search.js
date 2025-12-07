/**
 * Search and analytics routes
 */
const express = require('express');
const db = require('../database');
const calculations = require('../calculations');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Search negotiations
 * POST /api/search
 */
router.post('/', (req, res) => {
  const { query, filters } = req.body;

  db.getAllNegotiationsByUser(req.userId, (err, negotiations) => {
    if (err) {
      console.error('Error fetching negotiations for search:', err.message);
      return res.status(500).json({ error: 'Search failed' });
    }

    let results = negotiations || [];

    // Text search
    if (query && typeof query === 'string' && query.trim() !== '') {
      const q = query.toLowerCase();
      results = results.filter(n =>
        (n.name && n.name.toLowerCase().includes(q)) ||
        (n.plaintiff_attorney && n.plaintiff_attorney.toLowerCase().includes(q)) ||
        (n.defendant_attorney && n.defendant_attorney.toLowerCase().includes(q)) ||
        (n.mediator && n.mediator.toLowerCase().includes(q))
      );
    }

    // Apply filters
    if (filters && typeof filters === 'object') {
      if (filters.status) {
        results = results.filter(n => n.status === filters.status);
      }
      if (filters.venue) {
        results = results.filter(n => n.venue === filters.venue);
      }
      if (filters.defendant_type) {
        results = results.filter(n => n.defendant_type === filters.defendant_type);
      }
    }

    res.json(results);
  });
});

/**
 * Get analytics summary for a negotiation
 * GET /api/analytics/:negotiation_id
 */
router.get('/:negotiation_id', (req, res) => {
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

    db.getMovesByNegotiationId(negotiation_id, (err, moves) => {
      if (err) {
        console.error('Error fetching moves for analytics:', err.message);
        return res.status(500).json({ error: 'Failed to fetch analytics' });
      }

      const analytics = calculations.calculateAnalytics(moves || []);
      res.json(analytics);
    });
  });
});

module.exports = router;
