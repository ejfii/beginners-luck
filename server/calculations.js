// Calculate midpoint between demand and offer
function calculateMidpoint(demand, offer) {
  return (demand + offer) / 2;
}

// Calculate momentum (rate of convergence)
function calculateMomentum(moves) {
  if (moves.length < 2) return 0;

  const demands = moves.filter(m => m.type === 'demand').map(m => m.amount);
  const offers = moves.filter(m => m.type === 'offer').map(m => m.amount);

  if (demands.length === 0 || offers.length === 0) return 0;

  const firstDemand = demands[0];
  const lastDemand = demands[demands.length - 1];
  const firstOffer = offers[0];
  const lastOffer = offers[offers.length - 1];

  // Calculate movement percentages
  const demandMovement = ((firstDemand - lastDemand) / firstDemand) * 100;
  const offerMovement = ((lastOffer - firstOffer) / firstOffer) * 100;

  // Average momentum
  return (demandMovement + offerMovement) / 2;
}

// Calculate convergence rate
function calculateConvergenceRate(moves) {
  if (moves.length < 2) return 0;

  const demands = moves.filter(m => m.type === 'demand').map(m => m.amount);
  const offers = moves.filter(m => m.type === 'offer').map(m => m.amount);

  if (demands.length === 0 || offers.length === 0) return 0;

  const gap = Math.abs(demands[demands.length - 1] - offers[offers.length - 1]);
  const initialGap = Math.abs(demands[0] - offers[0]);

  return initialGap === 0 ? 0 : ((initialGap - gap) / initialGap) * 100;
}

// Predict settlement based on trajectory
function predictSettlement(moves) {
  if (moves.length < 2) return null;

  const demands = moves.filter(m => m.type === 'demand').map(m => m.amount);
  const offers = moves.filter(m => m.type === 'offer').map(m => m.amount);

  if (demands.length === 0 || offers.length === 0) return null;

  const lastDemand = demands[demands.length - 1];
  const lastOffer = offers[offers.length - 1];

  // Simple linear trajectory-based prediction
  const trend = (lastDemand + lastOffer) / 2;

  // Weighted prediction: 70% trajectory + 30% historical midpoint
  const historicalMidpoint = moves.reduce((sum, m) => sum + m.amount, 0) / moves.length;
  const prediction = (trend * 0.7) + (historicalMidpoint * 0.3);

  return Math.round(prediction);
}

// Calculate midpoint of midpoints
function calculateMidpointOfMidpoints(moves) {
  if (moves.length < 2) return null;

  const demands = moves.filter(m => m.type === 'demand').map(m => m.amount);
  const offers = moves.filter(m => m.type === 'offer').map(m => m.amount);

  if (demands.length === 0 || offers.length === 0) return null;

  const midpoints = [];
  const minLength = Math.min(demands.length, offers.length);

  for (let i = 0; i < minLength; i++) {
    midpoints.push((demands[i] + offers[i]) / 2);
  }

  return midpoints.length > 0 ? midpoints.reduce((a, b) => a + b) / midpoints.length : null;
}

// Calculate confidence score for prediction
function calculateConfidence(moves) {
  if (moves.length < 2) return 0;

  const convergence = calculateConvergenceRate(moves);
  const momentum = calculateMomentum(moves);

  // Higher convergence = higher confidence
  // Positive momentum = higher confidence
  const confidence = (convergence * 0.6) + (Math.max(0, momentum) * 0.4);

  return Math.min(100, Math.max(0, confidence));
}

// Determine negotiation status
function determineStatus(moves) {
  if (moves.length === 0) return 'initiated';

  const demands = moves.filter(m => m.type === 'demand');
  const offers = moves.filter(m => m.type === 'offer');

  if (demands.length === 0 || offers.length === 0) return 'active';

  const lastDemand = demands[demands.length - 1].amount;
  const lastOffer = offers[offers.length - 1].amount;

  const gap = Math.abs(lastDemand - lastOffer);

  // If gap is less than 5% of the offer, consider it settled
  if (gap / lastOffer < 0.05) {
    return 'settled';
  }

  return 'active';
}

// Calculate all analytics
function calculateAnalytics(moves) {
  const currentMidpoint = moves.length >= 2 ? 
    calculateMidpoint(
      moves.filter(m => m.type === 'demand').pop()?.amount || 0,
      moves.filter(m => m.type === 'offer').pop()?.amount || 0
    ) : null;

  return {
    midpoint: currentMidpoint,
    midpoint_of_midpoints: calculateMidpointOfMidpoints(moves),
    momentum: calculateMomentum(moves),
    convergence_rate: calculateConvergenceRate(moves),
    predicted_settlement: predictSettlement(moves),
    confidence: calculateConfidence(moves),
    status: determineStatus(moves)
  };
}

/**
 * Calculate recommended next move based on current negotiation state
 * 
 * ALGORITHM DOCUMENTATION:
 * 
 * The recommended move function uses the following logic:
 * 
 * 1. DETERMINE PARTY ROLE:
 *    - Identifies which party should move based on recent activity
 *    - If last move was an offer, suggest a demand (and vice versa)
 *    - Prevents same party from moving twice in a row
 * 
 * 2. CALCULATE TARGET BASED ON SETTLEMENT GOAL:
 *    - If settlement goal is set: moves toward goal proportionally
 *      - Plaintiff moves down toward goal in 70% increments
 *      - Defendant moves up toward goal in 70% increments
 *    - If no goal: use convergence toward midpoint
 * 
 * 3. APPLY MOMENTUM CONSIDERATION:
 *    - Positive momentum (convergence): smaller steps (conservative)
 *    - Negative momentum (divergence): larger steps (more aggressive)
 *    - Formula: step_adjustment = 1 + (momentum / 100) * 0.3
 * 
 * 4. CONVERGENCE PRESSURE:
 *    - If gap between demand/offer < 15%: reduce suggested movement
 *    - Forces final moves to be smaller and more reasonable
 * 
 * 5. MINIMUM GAP ENFORCEMENT:
 *    - Ensures gap never closes to zero (maintains negotiation room)
 *    - Prevents unrealistic settlements
 */
function calculateRecommendedMove(negotiation, moves) {
  if (!moves || moves.length === 0) {
    return null; // No moves yet, can't recommend
  }

  const demands = moves.filter(m => m.type === 'demand');
  const offers = moves.filter(m => m.type === 'offer');

  if (demands.length === 0 || offers.length === 0) {
    return null; // Need both types to make recommendation
  }

  const lastDemand = demands[demands.length - 1];
  const lastOffer = offers[offers.length - 1];
  const currentGap = Math.abs(lastDemand.amount - lastOffer.amount);

  // Determine whose turn it is to move
  const lastMove = moves[moves.length - 1];
  let recommendedParty = lastMove.type === 'offer' ? 'plaintiff' : 'defendant';

  // Calculate momentum adjustment (conservative with positive momentum, aggressive with negative)
  const momentum = calculateMomentum(moves);
  const momentumAdjustment = 1 + (momentum / 100) * 0.3;

  let recommendedAmount;

  if (negotiation.settlement_goal) {
    // Move toward settlement goal
    const goal = negotiation.settlement_goal;

    if (recommendedParty === 'plaintiff') {
      // Plaintiff (demanding) moves down toward goal
      const moveAmount = (lastDemand.amount - goal) * 0.7 * momentumAdjustment;
      recommendedAmount = Math.max(goal + currentGap * 0.05, lastDemand.amount - moveAmount);
    } else {
      // Defendant (offering) moves up toward goal
      const moveAmount = (goal - lastOffer.amount) * 0.7 * momentumAdjustment;
      recommendedAmount = Math.min(goal - currentGap * 0.05, lastOffer.amount + moveAmount);
    }
  } else {
    // Move toward midpoint without goal
    const midpoint = calculateMidpoint(lastDemand.amount, lastOffer.amount);

    if (recommendedParty === 'plaintiff') {
      const moveAmount = (lastDemand.amount - midpoint) * 0.7 * momentumAdjustment;
      recommendedAmount = Math.max(midpoint + currentGap * 0.05, lastDemand.amount - moveAmount);
    } else {
      const moveAmount = (midpoint - lastOffer.amount) * 0.7 * momentumAdjustment;
      recommendedAmount = Math.min(midpoint - currentGap * 0.05, lastOffer.amount + moveAmount);
    }
  }

  // Apply convergence pressure - reduce steps when gap is small
  const convergenceRate = calculateConvergenceRate(moves);
  if (currentGap / lastOffer.amount < 0.15) {
    // Gap is less than 15%, reduce recommended movement
    recommendedAmount = lastMove.type === 'offer' 
      ? lastDemand.amount - (lastDemand.amount - recommendedAmount) * 0.5
      : lastOffer.amount + (recommendedAmount - lastOffer.amount) * 0.5;
  }

  return {
    party: recommendedParty,
    type: recommendedParty === 'plaintiff' ? 'demand' : 'offer',
    suggestedAmount: Math.round(recommendedAmount),
    reasoning: generateMoveReasoning(negotiation, lastDemand, lastOffer, recommendedParty, momentum, convergenceRate),
    confidence: calculateConfidence(moves)
  };
}

/**
 * Generate human-readable explanation for recommended move
 */
function generateMoveReasoning(negotiation, lastDemand, lastOffer, party, momentum, _convergenceRate) {
  const gap = Math.abs(lastDemand.amount - lastOffer.amount);
  const gapPercent = ((gap / lastOffer.amount) * 100).toFixed(1);

  let reasoning = `Current gap: $${gap.toLocaleString()} (${gapPercent}% of offer). `;

  if (momentum > 5) {
    reasoning += `Good convergence momentum (${momentum.toFixed(1)}%). Make a modest move. `;
  } else if (momentum < -5) {
    reasoning += `Diverging positions (${momentum.toFixed(1)}%). More aggressive movement needed. `;
  } else {
    reasoning += `Steady negotiation pace. `;
  }

  if (negotiation.settlement_goal) {
    reasoning += `Moving toward settlement goal of $${negotiation.settlement_goal.toLocaleString()}.`;
  } else {
    reasoning += `Moving toward midpoint consensus.`;
  }

  return reasoning;
}

module.exports = {
  calculateMidpoint,
  calculateMomentum,
  calculateConvergenceRate,
  predictSettlement,
  calculateMidpointOfMidpoints,
  calculateConfidence,
  determineStatus,
  calculateAnalytics,
  calculateRecommendedMove,
  generateMoveReasoning
};
