/**
 * Party routes - Manage multiple plaintiffs and defendants per negotiation
 */
const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Get all parties for a negotiation
 * GET /api/negotiations/:negotiationId/parties
 */
router.get('/negotiations/:negotiationId/parties', (req, res) => {
  const { negotiationId } = req.params;

  if (isNaN(negotiationId)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(negotiationId, (err, negotiation) => {
    if (err) {
      console.error('Error fetching negotiation:', err.message);
      return res.status(500).json({ error: 'Failed to verify negotiation' });
    }

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get all parties for this negotiation
    db.getPartiesByNegotiationId(negotiationId, (err, parties) => {
      if (err) {
        console.error('Error fetching parties:', err.message);
        return res.status(500).json({ error: 'Failed to fetch parties' });
      }

      res.json(parties || []);
    });
  });
});

/**
 * Create a new party for a negotiation
 * POST /api/negotiations/:negotiationId/parties
 */
router.post('/negotiations/:negotiationId/parties', (req, res) => {
  const { negotiationId } = req.params;
  const { role, party_name, attorney_name, law_firm_name } = req.body;

  if (isNaN(negotiationId)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Validation
  const errors = [];
  if (!role || !['plaintiff', 'defendant'].includes(role)) {
    errors.push('Role is required and must be either "plaintiff" or "defendant"');
  }
  if (!party_name || typeof party_name !== 'string' || party_name.trim() === '') {
    errors.push('Party name is required');
  }
  if (attorney_name && typeof attorney_name !== 'string') {
    errors.push('Attorney name must be a string');
  }
  if (law_firm_name && typeof law_firm_name !== 'string') {
    errors.push('Law firm name must be a string');
  }

  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(negotiationId, (err, negotiation) => {
    if (err) {
      console.error('Error fetching negotiation:', err.message);
      return res.status(500).json({ error: 'Failed to verify negotiation' });
    }

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Create the party
    const partyData = {
      negotiation_id: negotiationId,
      role,
      party_name: party_name.trim(),
      attorney_name: attorney_name ? attorney_name.trim() : null,
      law_firm_name: law_firm_name ? law_firm_name.trim() : null
    };

    db.createParty(partyData, (err, result) => {
      if (err) {
        console.error('Error creating party:', err.message);
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json(result);
    });
  });
});

/**
 * Update a party
 * PUT /api/parties/:id
 */
router.put('/parties/:id', (req, res) => {
  const { id } = req.params;
  const { party_name, attorney_name, law_firm_name } = req.body;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid party ID' });
  }

  // Get the party to verify ownership
  db.getPartyById(id, (err, party) => {
    if (err) {
      console.error('Error fetching party:', err.message);
      return res.status(500).json({ error: 'Failed to fetch party' });
    }

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Verify user owns the negotiation this party belongs to
    db.getNegotiationById(party.negotiation_id, (err, negotiation) => {
      if (err) {
        console.error('Error fetching negotiation:', err.message);
        return res.status(500).json({ error: 'Failed to verify negotiation' });
      }

      if (!negotiation || negotiation.user_id !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Build updates object
      const updates = {};
      if (party_name !== undefined) updates.party_name = party_name.trim();
      if (attorney_name !== undefined) updates.attorney_name = attorney_name ? attorney_name.trim() : null;
      if (law_firm_name !== undefined) updates.law_firm_name = law_firm_name ? law_firm_name.trim() : null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      // Validation
      if (updates.party_name && updates.party_name === '') {
        return res.status(400).json({ error: 'Party name cannot be empty' });
      }

      db.updateParty(id, updates, (err, result) => {
        if (err) {
          console.error('Error updating party:', err.message);
          return res.status(400).json({ error: err.message });
        }
        res.json(result);
      });
    });
  });
});

/**
 * Delete a party
 * DELETE /api/parties/:id
 */
router.delete('/parties/:id', (req, res) => {
  const { id } = req.params;

  if (isNaN(id)) {
    return res.status(400).json({ error: 'Invalid party ID' });
  }

  // Get the party to verify ownership
  db.getPartyById(id, (err, party) => {
    if (err) {
      console.error('Error fetching party:', err.message);
      return res.status(500).json({ error: 'Failed to fetch party' });
    }

    if (!party) {
      return res.status(404).json({ error: 'Party not found' });
    }

    // Verify user owns the negotiation this party belongs to
    db.getNegotiationById(party.negotiation_id, (err, negotiation) => {
      if (err) {
        console.error('Error fetching negotiation:', err.message);
        return res.status(500).json({ error: 'Failed to verify negotiation' });
      }

      if (!negotiation || negotiation.user_id !== req.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
      }

      db.deleteParty(id, (err) => {
        if (err) {
          console.error('Error deleting party:', err.message);
          return res.status(500).json({ error: 'Failed to delete party' });
        }
        res.json({ message: 'Party deleted successfully' });
      });
    });
  });
});

module.exports = router;
