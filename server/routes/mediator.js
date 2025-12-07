/**
 * Mediator proposal routes
 */
const express = require('express');
const db = require('../database');
const { validateMediatorProposal, sanitizeMediatorProposal } = require('../validation');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Get mediator proposal for a negotiation
 * GET /api/negotiations/:id/mediator-proposal
 */
router.get('/:negotiation_id/mediator-proposal', (req, res) => {
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

    db.getMediatorProposal(negotiation_id, (err, proposal) => {
      if (err) {
        console.error('Error fetching mediator proposal:', err.message);
        return res.status(500).json({ error: 'Failed to fetch mediator proposal' });
      }

      // Check if expired
      if (proposal && proposal.status === 'pending' && new Date(proposal.deadline) < new Date()) {
        db.updateMediatorProposal(negotiation_id, { status: 'expired' }, () => {
          res.json({ ...proposal, status: 'expired' });
        });
      } else {
        res.json(proposal || null);
      }
    });
  });
});

/**
 * Create or replace mediator proposal
 * POST /api/negotiations/:id/mediator-proposal
 */
router.post('/:negotiation_id/mediator-proposal', (req, res) => {
  const { negotiation_id } = req.params;
  const proposalData = { ...req.body, negotiation_id: parseInt(negotiation_id) };

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const validation = validateMediatorProposal(proposalData);
    if (!validation.isValid) {
      return res.status(400).json({ error: 'Validation failed', details: validation.errors });
    }

    const sanitized = sanitizeMediatorProposal(proposalData);
    db.createMediatorProposal(sanitized, (err, result) => {
      if (err) {
        console.error('Error creating mediator proposal:', err.message);
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json(result);
    });
  });
});

/**
 * Update mediator proposal status (accept/reject by party)
 * PUT /api/negotiations/:id/mediator-proposal
 */
router.put('/:negotiation_id/mediator-proposal', (req, res) => {
  const { negotiation_id } = req.params;
  const { party, response } = req.body; // party: 'plaintiff' or 'defendant', response: 'accepted' or 'rejected'

  if (isNaN(negotiation_id)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  if (!party || !['plaintiff', 'defendant'].includes(party)) {
    return res.status(400).json({ error: 'Party must be "plaintiff" or "defendant"' });
  }

  if (!response || !['accepted', 'rejected'].includes(response)) {
    return res.status(400).json({ error: 'Response must be "accepted" or "rejected"' });
  }

  // Verify user owns this negotiation
  db.getNegotiationById(negotiation_id, (err, negotiation) => {
    if (err || !negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get current proposal
    db.getMediatorProposal(negotiation_id, (err, proposal) => {
      if (err || !proposal) {
        return res.status(404).json({ error: 'Mediator proposal not found' });
      }

      // Check if expired
      if (new Date(proposal.deadline) < new Date()) {
        return res.status(400).json({ error: 'Proposal has expired' });
      }

      // Update the response for the specified party
      const updates = {};
      if (party === 'plaintiff') {
        updates.plaintiff_response = response;
      } else {
        updates.defendant_response = response;
      }

      // Determine overall status
      const plaintiffResp = party === 'plaintiff' ? response : proposal.plaintiff_response;
      const defendantResp = party === 'defendant' ? response : proposal.defendant_response;

      if (response === 'rejected') {
        updates.status = 'rejected';
      } else if (plaintiffResp === 'accepted' && defendantResp === 'accepted') {
        updates.status = 'accepted_both';
      } else if (plaintiffResp === 'accepted') {
        updates.status = 'accepted_plaintiff';
      } else if (defendantResp === 'accepted') {
        updates.status = 'accepted_defendant';
      }

      db.updateMediatorProposal(negotiation_id, updates, (err) => {
        if (err) {
          console.error('Error updating mediator proposal:', err.message);
          return res.status(400).json({ error: err.message });
        }
        res.json({ message: 'Mediator proposal updated successfully', status: updates.status });
      });
    });
  });
});

/**
 * Check and mark expired proposals
 * POST /api/mediator-proposals/check-expired
 */
router.post('/check-expired', (req, res) => {
  db.checkExpiredProposals((err, changes) => {
    if (err) {
      console.error('Error checking expired proposals:', err.message);
      return res.status(500).json({ error: 'Failed to check expired proposals' });
    }
    res.json({ message: `Marked ${changes} proposals as expired` });
  });
});

module.exports = router;
