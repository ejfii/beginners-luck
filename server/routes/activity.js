/**
 * Activity Timeline routes
 * Provides a unified chronological feed of all case activities
 */
const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Get activity timeline for a specific negotiation
 * GET /api/negotiations/:id/activity
 * 
 * Returns a unified chronological feed of:
 * - Moves (offers/demands)
 * - Bracket proposals
 * - Mediator proposals
 * - Status changes (if tracked)
 */
router.get('/:id/activity', (req, res) => {
  const { id } = req.params;
  const negotiationId = parseInt(id, 10);

  if (isNaN(negotiationId)) {
    return res.status(400).json({ error: 'Invalid negotiation ID' });
  }

  // Verify the negotiation belongs to the current user
  db.getNegotiationById(negotiationId, (err, negotiation) => {
    if (err) {
      console.error('Error fetching negotiation:', err.message);
      return res.status(500).json({ error: 'Failed to fetch negotiation' });
    }

    if (!negotiation) {
      return res.status(404).json({ error: 'Negotiation not found' });
    }

    if (negotiation.user_id !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Fetch all activity types
    const activities = [];
    let queriesCompleted = 0;
    const totalQueries = 3; // moves, brackets, mediator_proposals

    // 1. Fetch moves
    db.getConnection().all(
      'SELECT id, timestamp, party, type, amount, notes FROM moves WHERE negotiation_id = ? ORDER BY timestamp DESC',
      [negotiationId],
      (err, moves) => {
        if (!err && moves) {
          moves.forEach(move => {
            activities.push({
              id: `move-${move.id}`,
              type: 'move',
              timestamp: move.timestamp,
              data: {
                party: move.party,
                moveType: move.type,
                amount: move.amount,
                notes: move.notes
              }
            });
          });
        }
        queriesCompleted++;
        if (queriesCompleted === totalQueries) {
          sendResponse();
        }
      }
    );

    // 2. Fetch brackets
    db.getConnection().all(
      'SELECT id, created_at, plaintiff_amount, defendant_amount, notes, status, proposed_by FROM brackets WHERE negotiation_id = ? ORDER BY created_at DESC',
      [negotiationId],
      (err, brackets) => {
        if (!err && brackets) {
          brackets.forEach(bracket => {
            activities.push({
              id: `bracket-${bracket.id}`,
              type: 'bracket',
              timestamp: bracket.created_at,
              data: {
                plaintiffAmount: bracket.plaintiff_amount,
                defendantAmount: bracket.defendant_amount,
                notes: bracket.notes,
                status: bracket.status,
                proposedBy: bracket.proposed_by
              }
            });
          });
        }
        queriesCompleted++;
        if (queriesCompleted === totalQueries) {
          sendResponse();
        }
      }
    );

    // 3. Fetch mediator proposals
    db.getConnection().all(
      'SELECT id, created_at, amount, deadline, notes, status, plaintiff_response, defendant_response FROM mediator_proposals WHERE negotiation_id = ? ORDER BY created_at DESC',
      [negotiationId],
      (err, proposals) => {
        if (!err && proposals) {
          proposals.forEach(proposal => {
            activities.push({
              id: `mediator-proposal-${proposal.id}`,
              type: 'mediator_proposal',
              timestamp: proposal.created_at,
              data: {
                amount: proposal.amount,
                deadline: proposal.deadline,
                notes: proposal.notes,
                status: proposal.status,
                plaintiffResponse: proposal.plaintiff_response,
                defendantResponse: proposal.defendant_response
              }
            });
          });
        }
        queriesCompleted++;
        if (queriesCompleted === totalQueries) {
          sendResponse();
        }
      }
    );

    function sendResponse() {
      // Sort all activities by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        negotiationId,
        activities,
        totalCount: activities.length
      });
    }
  });
});

module.exports = router;
