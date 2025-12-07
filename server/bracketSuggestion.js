/**
 * Bracket suggestion calculation logic
 * Provides smart bracket recommendations based on negotiation state
 */

/**
 * Calculate a suggested bracket based on current negotiation data
 * 
 * Strategy:
 * 1. Find the last plaintiff demand and last defendant offer
 * 2. Calculate the gap between them
 * 3. Use settlement_goal (if available) to position the bracket intelligently
 * 4. Position bracket to leave room for movement toward settlement
 * 
 * @param {object} negotiation - The negotiation object with settlement_goal, etc.
 * @param {array} moves - Array of moves (demands/offers) for this negotiation
 * @returns {object} - { plaintiff_amount, defendant_amount, reasoning }
 */
function calculateBracketSuggestion(negotiation, moves) {
  // Get last plaintiff demand and last defendant offer
  const plaintiffMoves = moves.filter(m => m.party === 'plaintiff' && m.type === 'demand');
  const defendantMoves = moves.filter(m => m.party === 'defendant' && m.type === 'offer');
  
  const lastPlaintiffDemand = plaintiffMoves.length > 0 
    ? plaintiffMoves[plaintiffMoves.length - 1].amount 
    : null;
  const lastDefendantOffer = defendantMoves.length > 0 
    ? defendantMoves[defendantMoves.length - 1].amount 
    : null;
  
  // Get settlement goal if available
  const settlementGoal = negotiation.settlement_goal || null;
  
  // Get policy limits for context
  const policyLimit = negotiation.primary_coverage_limit || null;
  
  let plaintiffAmount;
  let defendantAmount;
  let reasoning;
  
  // Case 1: We have both a last demand and last offer
  if (lastPlaintiffDemand && lastDefendantOffer) {
    const gap = lastPlaintiffDemand - lastDefendantOffer;
    const midpoint = lastDefendantOffer + (gap / 2);
    
    if (settlementGoal && settlementGoal > lastDefendantOffer && settlementGoal < lastPlaintiffDemand) {
      // Settlement goal is within the current range - use it as anchor
      // Plaintiff should be slightly above goal (leaves room to come down to goal)
      plaintiffAmount = Math.round(settlementGoal * 1.15); // 15% above goal
      // Defendant should be below goal but above their last offer
      defendantAmount = Math.round(lastDefendantOffer + ((settlementGoal - lastDefendantOffer) * 0.6)); // 60% of the way
      
      reasoning = `Based on settlement goal of $${settlementGoal.toLocaleString()}, ` +
                  `last demand of $${lastPlaintiffDemand.toLocaleString()}, ` +
                  `and last offer of $${lastDefendantOffer.toLocaleString()}. ` +
                  `This bracket positions both parties to move toward the settlement goal.`;
    } else {
      // No goal or goal is outside range - use midpoint strategy
      // Plaintiff at 60% of gap above midpoint
      plaintiffAmount = Math.round(midpoint + (gap * 0.1));
      // Defendant at 60% of gap below midpoint  
      defendantAmount = Math.round(midpoint - (gap * 0.1));
      
      reasoning = `Based on last demand of $${lastPlaintiffDemand.toLocaleString()} ` +
                  `and last offer of $${lastDefendantOffer.toLocaleString()}. ` +
                  `This bracket narrows the gap while leaving room for both parties to move.`;
    }
  }
  // Case 2: Only plaintiff demand exists
  else if (lastPlaintiffDemand && !lastDefendantOffer) {
    if (settlementGoal && settlementGoal < lastPlaintiffDemand) {
      // Use settlement goal as reference
      plaintiffAmount = Math.round(settlementGoal * 1.1); // 10% above goal
      defendantAmount = Math.round(settlementGoal * 0.7); // 70% of goal
      
      reasoning = `Based on settlement goal of $${settlementGoal.toLocaleString()} ` +
                  `and last demand of $${lastPlaintiffDemand.toLocaleString()}. ` +
                  `No defendant offer yet - bracket provides a starting negotiation range.`;
    } else {
      // Use demand as reference
      plaintiffAmount = Math.round(lastPlaintiffDemand * 0.85); // 85% of demand
      defendantAmount = Math.round(lastPlaintiffDemand * 0.50); // 50% of demand
      
      reasoning = `Based on last demand of $${lastPlaintiffDemand.toLocaleString()}. ` +
                  `No defendant offer yet - bracket provides a reasonable negotiation range.`;
    }
  }
  // Case 3: Only defendant offer exists  
  else if (lastDefendantOffer && !lastPlaintiffDemand) {
    if (settlementGoal && settlementGoal > lastDefendantOffer) {
      // Use settlement goal as reference
      plaintiffAmount = Math.round(settlementGoal * 1.2); // 20% above goal
      defendantAmount = Math.round(settlementGoal * 0.8); // 80% of goal
      
      reasoning = `Based on settlement goal of $${settlementGoal.toLocaleString()} ` +
                  `and last offer of $${lastDefendantOffer.toLocaleString()}. ` +
                  `No plaintiff demand yet - bracket provides a starting negotiation range.`;
    } else {
      // Use offer as reference
      plaintiffAmount = Math.round(lastDefendantOffer * 2.5); // 2.5x the offer
      defendantAmount = Math.round(lastDefendantOffer * 1.3); // 1.3x the offer
      
      reasoning = `Based on last offer of $${lastDefendantOffer.toLocaleString()}. ` +
                  `No plaintiff demand yet - bracket provides a reasonable negotiation range.`;
    }
  }
  // Case 4: No moves at all
  else {
    if (settlementGoal) {
      // Use settlement goal as sole reference
      plaintiffAmount = Math.round(settlementGoal * 1.3); // 30% above goal
      defendantAmount = Math.round(settlementGoal * 0.7); // 70% of goal
      
      reasoning = `Based on settlement goal of $${settlementGoal.toLocaleString()}. ` +
                  `No moves yet - bracket provides a starting negotiation range around the goal.`;
    } else if (policyLimit) {
      // Use policy limit as reference
      plaintiffAmount = Math.round(policyLimit * 0.9); // 90% of limit
      defendantAmount = Math.round(policyLimit * 0.5); // 50% of limit
      
      reasoning = `Based on policy limit of $${policyLimit.toLocaleString()}. ` +
                  `No moves or settlement goal - bracket provides a range within policy limits.`;
    } else {
      // Absolute fallback - generic PI case amounts
      plaintiffAmount = 2000000; // $2M
      defendantAmount = 750000;  // $750k
      
      reasoning = `No moves, settlement goal, or policy limits available. ` +
                  `Bracket uses typical personal injury negotiation amounts as a starting point.`;
    }
  }
  
  // Ensure amounts are positive and plaintiff > defendant
  plaintiffAmount = Math.max(plaintiffAmount, 1000);
  defendantAmount = Math.max(defendantAmount, 1000);
  
  if (defendantAmount >= plaintiffAmount) {
    // Swap if needed and adjust
    const temp = plaintiffAmount;
    plaintiffAmount = defendantAmount * 1.5;
    defendantAmount = temp * 0.7;
  }
  
  // Respect policy limits if available
  if (policyLimit && plaintiffAmount > policyLimit) {
    plaintiffAmount = Math.round(policyLimit * 0.95);
    if (defendantAmount > plaintiffAmount * 0.7) {
      defendantAmount = Math.round(plaintiffAmount * 0.6);
    }
    reasoning += ` Amounts adjusted to respect policy limit of $${policyLimit.toLocaleString()}.`;
  }
  
  return {
    plaintiff_amount: Math.round(plaintiffAmount),
    defendant_amount: Math.round(defendantAmount),
    reasoning: reasoning
  };
}

module.exports = {
  calculateBracketSuggestion
};
