/**
 * Party routes - Manage multiple plaintiffs and defendants per negotiation
 */
const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');
const { validateParty, sanitizeParty } = require('../validation');

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

  // Validate and sanitize input
  const partyData = {
    negotiation_id: negotiationId,
    ...req.body
  };

  const validation = validateParty(partyData);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Validation failed', details: validation.errors });
  }

  const sanitized = sanitizeParty(partyData);

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

    // Create the party with sanitized data
    db.createParty(sanitized, (err, result) => {
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

      // Merge existing party data with updates for validation
      const partyData = {
        negotiation_id: party.negotiation_id,
        role: party.role,
        party_name: req.body.party_name !== undefined ? req.body.party_name : party.party_name,
        attorney_name: req.body.attorney_name !== undefined ? req.body.attorney_name : party.attorney_name,
        law_firm_name: req.body.law_firm_name !== undefined ? req.body.law_firm_name : party.law_firm_name
      };

      const validation = validateParty(partyData);
      if (!validation.isValid) {
        return res.status(400).json({ error: 'Validation failed', details: validation.errors });
      }

      const sanitized = sanitizeParty(partyData);

      // Build updates object (only fields that were actually provided in request)
      const updates = {};
      if (req.body.party_name !== undefined) updates.party_name = sanitized.party_name;
      if (req.body.attorney_name !== undefined) updates.attorney_name = sanitized.attorney_name;
      if (req.body.law_firm_name !== undefined) updates.law_firm_name = sanitized.law_firm_name;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
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
