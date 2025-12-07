/**
 * Analytics routes - Insurer and adjuster intelligence
 */
const express = require('express');
const db = require('../database');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

/**
 * Get analytics for a specific insurer
 * GET /api/analytics/insurer/:insurerName
 */
router.get('/insurer/:insurerName', (req, res) => {
  const { insurerName } = req.params;
  const userId = req.userId;

  if (!insurerName || insurerName.trim() === '') {
    return res.status(400).json({ error: 'Insurer name is required' });
  }

  // Query for all settled negotiations with this insurer (for the current user)
  const query = `
    SELECT 
      n.id,
      n.name,
      n.status,
      n.created_date,
      n.updated_date,
      n.primary_insurer_name,
      n.umbrella_insurer_name,
      n.uim_insurer_name,
      n.primary_adjuster_name,
      n.umbrella_adjuster_name,
      n.uim_adjuster_name,
      n.settlement_goal,
      n.policy_limits,
      n.primary_coverage_limit,
      n.umbrella_coverage_limit,
      n.uim_coverage_limit
    FROM negotiations n
    WHERE n.user_id = ?
      AND n.deleted_at IS NULL
      AND (
        LOWER(n.primary_insurer_name) = LOWER(?)
        OR LOWER(n.umbrella_insurer_name) = LOWER(?)
        OR LOWER(n.uim_insurer_name) = LOWER(?)
      )
    ORDER BY n.updated_date DESC
  `;

  db.getConnection().all(query, [userId, insurerName, insurerName, insurerName], (err, negotiations) => {
    if (err) {
      console.error('Error fetching insurer analytics:', err);
      return res.status(500).json({ error: 'Failed to fetch insurer analytics' });
    }

    // For each negotiation, get final settlement amount from moves
    let processedCount = 0;
    const negotiationsWithData = [];

    if (!negotiations || negotiations.length === 0) {
      return res.json({
        insurer_name: insurerName,
        total_cases: 0,
        settled_cases: 0,
        active_cases: 0,
        cases: [],
        statistics: {
          avg_settlement: null,
          avg_duration_days: null,
          settlement_rate: null,
          avg_policy_limit: null,
          total_moves_avg: null
        }
      });
    }

    negotiations.forEach((neg) => {
      // Get moves for this negotiation
      db.getMovesByNegotiationId(neg.id, (err, moves) => {
        if (!err && moves) {
          // Find final settlement amount (last move)
          const finalMove = moves.length > 0 ? moves[moves.length - 1] : null;
          const settlementAmount = finalMove ? finalMove.amount : null;

          // Calculate duration
          const createdDate = new Date(neg.created_date);
          const updatedDate = new Date(neg.updated_date);
          const durationDays = Math.floor((updatedDate - createdDate) / (1000 * 60 * 60 * 24));

          negotiationsWithData.push({
            id: neg.id,
            name: neg.name,
            status: neg.status,
            created_date: neg.created_date,
            updated_date: neg.updated_date,
            settlement_amount: settlementAmount,
            settlement_goal: neg.settlement_goal,
            policy_limits: neg.policy_limits,
            duration_days: durationDays,
            total_moves: moves.length,
            moves: moves
          });
        }

        processedCount++;

        // When all negotiations are processed, calculate statistics
        if (processedCount === negotiations.length) {
          const settledCases = negotiationsWithData.filter(n => n.status === 'settled');
          const activeCases = negotiationsWithData.filter(n => n.status === 'active');

          // Calculate statistics
          const settlementsWithAmount = settledCases.filter(n => n.settlement_amount);
          const avgSettlement = settlementsWithAmount.length > 0
            ? settlementsWithAmount.reduce((sum, n) => sum + n.settlement_amount, 0) / settlementsWithAmount.length
            : null;

          const casesWithDuration = settledCases.filter(n => n.duration_days > 0);
          const avgDuration = casesWithDuration.length > 0
            ? casesWithDuration.reduce((sum, n) => sum + n.duration_days, 0) / casesWithDuration.length
            : null;

          const settlementRate = negotiations.length > 0
            ? (settledCases.length / negotiations.length) * 100
            : null;

          const casesWithPolicy = negotiationsWithData.filter(n => n.policy_limits);
          const avgPolicyLimit = casesWithPolicy.length > 0
            ? casesWithPolicy.reduce((sum, n) => sum + n.policy_limits, 0) / casesWithPolicy.length
            : null;

          const avgMoves = negotiationsWithData.length > 0
            ? negotiationsWithData.reduce((sum, n) => sum + n.total_moves, 0) / negotiationsWithData.length
            : null;

          res.json({
            insurer_name: insurerName,
            total_cases: negotiations.length,
            settled_cases: settledCases.length,
            active_cases: activeCases.length,
            cases: negotiationsWithData,
            statistics: {
              avg_settlement: avgSettlement,
              avg_duration_days: avgDuration,
              settlement_rate: settlementRate,
              avg_policy_limit: avgPolicyLimit,
              total_moves_avg: avgMoves
            }
          });
        }
      });
    });
  });
});

/**
 * Get analytics for a specific adjuster
 * GET /api/analytics/adjuster/:adjusterName
 */
router.get('/adjuster/:adjusterName', (req, res) => {
  const { adjusterName } = req.params;
  const userId = req.userId;

  if (!adjusterName || adjusterName.trim() === '') {
    return res.status(400).json({ error: 'Adjuster name is required' });
  }

  // Query for all negotiations with this adjuster (for the current user)
  const query = `
    SELECT 
      n.id,
      n.name,
      n.status,
      n.created_date,
      n.updated_date,
      n.primary_insurer_name,
      n.umbrella_insurer_name,
      n.uim_insurer_name,
      n.primary_adjuster_name,
      n.umbrella_adjuster_name,
      n.uim_adjuster_name,
      n.settlement_goal,
      n.policy_limits,
      n.primary_coverage_limit,
      n.umbrella_coverage_limit,
      n.uim_coverage_limit
    FROM negotiations n
    WHERE n.user_id = ?
      AND n.deleted_at IS NULL
      AND (
        LOWER(n.primary_adjuster_name) = LOWER(?)
        OR LOWER(n.umbrella_adjuster_name) = LOWER(?)
        OR LOWER(n.uim_adjuster_name) = LOWER(?)
      )
    ORDER BY n.updated_date DESC
  `;

  db.getConnection().all(query, [userId, adjusterName, adjusterName, adjusterName], (err, negotiations) => {
    if (err) {
      console.error('Error fetching adjuster analytics:', err);
      return res.status(500).json({ error: 'Failed to fetch adjuster analytics' });
    }

    // For each negotiation, get moves and analyze negotiation patterns
    let processedCount = 0;
    const negotiationsWithData = [];

    if (!negotiations || negotiations.length === 0) {
      return res.json({
        adjuster_name: adjusterName,
        total_cases: 0,
        settled_cases: 0,
        active_cases: 0,
        cases: [],
        statistics: {
          avg_settlement: null,
          avg_duration_days: null,
          settlement_rate: null,
          avg_first_move_percentage: null,
          avg_moves_to_settle: null,
          typical_response_time: null
        },
        patterns: {
          aggressive_negotiator: false,
          quick_settler: false,
          policy_limits_comfortable: false
        }
      });
    }

    negotiations.forEach((neg) => {
      // Get moves for this negotiation
      db.getMovesByNegotiationId(neg.id, (err, moves) => {
        if (!err && moves) {
          // Analyze move patterns
          const plaintiffMoves = moves.filter(m => m.party === 'plaintiff');
          const defendantMoves = moves.filter(m => m.party === 'defendant');
          
          // First defendant move percentage (compared to first plaintiff demand)
          let firstMovePercentage = null;
          if (plaintiffMoves.length > 0 && defendantMoves.length > 0) {
            const firstDemand = plaintiffMoves[0].amount;
            const firstOffer = defendantMoves[0].amount;
            if (firstDemand > 0) {
              firstMovePercentage = (firstOffer / firstDemand) * 100;
            }
          }

          // Final settlement
          const finalMove = moves.length > 0 ? moves[moves.length - 1] : null;
          const settlementAmount = finalMove ? finalMove.amount : null;

          // Duration
          const createdDate = new Date(neg.created_date);
          const updatedDate = new Date(neg.updated_date);
          const durationDays = Math.floor((updatedDate - createdDate) / (1000 * 60 * 60 * 24));

          negotiationsWithData.push({
            id: neg.id,
            name: neg.name,
            status: neg.status,
            created_date: neg.created_date,
            updated_date: neg.updated_date,
            settlement_amount: settlementAmount,
            settlement_goal: neg.settlement_goal,
            policy_limits: neg.policy_limits,
            duration_days: durationDays,
            total_moves: moves.length,
            first_move_percentage: firstMovePercentage,
            moves: moves
          });
        }

        processedCount++;

        // When all negotiations are processed, calculate statistics
        if (processedCount === negotiations.length) {
          const settledCases = negotiationsWithData.filter(n => n.status === 'settled');
          const activeCases = negotiationsWithData.filter(n => n.status === 'active');

          // Calculate statistics
          const settlementsWithAmount = settledCases.filter(n => n.settlement_amount);
          const avgSettlement = settlementsWithAmount.length > 0
            ? settlementsWithAmount.reduce((sum, n) => sum + n.settlement_amount, 0) / settlementsWithAmount.length
            : null;

          const casesWithDuration = settledCases.filter(n => n.duration_days > 0);
          const avgDuration = casesWithDuration.length > 0
            ? casesWithDuration.reduce((sum, n) => sum + n.duration_days, 0) / casesWithDuration.length
            : null;

          const settlementRate = negotiations.length > 0
            ? (settledCases.length / negotiations.length) * 100
            : null;

          const casesWithFirstMove = negotiationsWithData.filter(n => n.first_move_percentage);
          const avgFirstMovePercentage = casesWithFirstMove.length > 0
            ? casesWithFirstMove.reduce((sum, n) => sum + n.first_move_percentage, 0) / casesWithFirstMove.length
            : null;

          const avgMovesToSettle = settledCases.length > 0
            ? settledCases.reduce((sum, n) => sum + n.total_moves, 0) / settledCases.length
            : null;

          // Determine patterns
          const quickSettler = avgDuration !== null && avgDuration < 30;
          const aggressiveNegotiator = avgFirstMovePercentage !== null && avgFirstMovePercentage < 40;
          
          // Check if they typically settle near policy limits
          const casesWithPolicyAndSettlement = settledCases.filter(n => n.policy_limits && n.settlement_amount);
          const policyLimitsComfortable = casesWithPolicyAndSettlement.length > 0
            ? casesWithPolicyAndSettlement.filter(n => n.settlement_amount >= n.policy_limits * 0.8).length / casesWithPolicyAndSettlement.length > 0.5
            : false;

          res.json({
            adjuster_name: adjusterName,
            total_cases: negotiations.length,
            settled_cases: settledCases.length,
            active_cases: activeCases.length,
            cases: negotiationsWithData,
            statistics: {
              avg_settlement: avgSettlement,
              avg_duration_days: avgDuration,
              settlement_rate: settlementRate,
              avg_first_move_percentage: avgFirstMovePercentage,
              avg_moves_to_settle: avgMovesToSettle,
              typical_response_time: avgDuration ? Math.floor(avgDuration / (avgMovesToSettle || 1)) : null
            },
            patterns: {
              aggressive_negotiator: aggressiveNegotiator,
              quick_settler: quickSettler,
              policy_limits_comfortable: policyLimitsComfortable
            }
          });
        }
      });
    });
  });
});

module.exports = router;
