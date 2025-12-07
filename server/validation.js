/**
 * Input validation and sanitization utilities
 */

/**
 * Validate negotiation creation data (strict)
 */
function validateNegotiationCreate(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Case name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Case name must be less than 255 characters');
  }

  // Optional fields validation
  const numericFields = ['past_medical_bills', 'future_medical_bills', 'lcp', 'lost_wages', 'loss_earning_capacity',
    'primary_coverage_limit', 'umbrella_coverage_limit', 'uim_coverage_limit'];
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const val = parseFloat(data[field]);
      if (isNaN(val) || val < 0) {
        errors.push(`${field} must be a valid positive number`);
      }
    }
  }

  const stringFields = ['plaintiff_attorney', 'defendant_attorney', 'mediator', 'venue', 'judge', 'coverage', 'defendant_type', 'injury_description',
    'primary_insurer_name', 'primary_adjuster_name', 'umbrella_insurer_name', 'umbrella_adjuster_name',
    'uim_insurer_name', 'uim_adjuster_name'];
  for (const field of stringFields) {
    if (data[field] && typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
    if (data[field] && data[field].length > 1000) {
      errors.push(`${field} must be less than 1000 characters`);
    }
  }

  if (data.status && !['active', 'settled', 'closed', 'withdrawn'].includes(data.status)) {
    errors.push('Invalid status value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate negotiation update data (lenient - only validate fields that are being updated)
 */
function validateNegotiationUpdate(data) {
  const errors = [];

  // Only validate name if it's being updated
  if (data.name !== undefined && data.name !== null) {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push('Case name is required');
    }
    if (data.name && data.name.length > 255) {
      errors.push('Case name must be less than 255 characters');
    }
  }

  // Only validate numeric fields if they're being updated
  const numericFields = ['past_medical_bills', 'future_medical_bills', 'lcp', 'lost_wages', 'loss_earning_capacity',
    'primary_coverage_limit', 'umbrella_coverage_limit', 'uim_coverage_limit',
    'medical_specials', 'economic_damages', 'non_economic_damages', 'policy_limits'];
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const val = parseFloat(data[field]);
      if (isNaN(val) || val < 0) {
        errors.push(`${field} must be a valid positive number`);
      }
    }
  }

  // Validate liability percentage (0-100) if being updated
  if (data.liability_percentage !== undefined && data.liability_percentage !== null && data.liability_percentage !== '') {
    const val = parseFloat(data.liability_percentage);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push('liability_percentage must be between 0 and 100');
    }
  }

  // Only validate string fields if they're being updated
  const stringFields = ['plaintiff_attorney', 'defendant_attorney', 'mediator', 'venue', 'judge', 'coverage', 'defendant_type', 'injury_description',
    'primary_insurer_name', 'primary_adjuster_name', 'umbrella_insurer_name', 'umbrella_adjuster_name',
    'uim_insurer_name', 'uim_adjuster_name', 'evaluation_notes'];
  for (const field of stringFields) {
    if (data[field] !== undefined && data[field] !== null) {
      if (typeof data[field] !== 'string') {
        errors.push(`${field} must be a string`);
      }
      if (data[field] && data[field].length > 1000) {
        errors.push(`${field} must be less than 1000 characters`);
      }
    }
  }

  if (data.status && !['active', 'settled', 'closed', 'withdrawn'].includes(data.status)) {
    errors.push('Invalid status value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate negotiation creation/update data (for backward compatibility)
 */
function validateNegotiation(data) {
  const errors = [];

  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push('Case name is required');
  }

  if (data.name && data.name.length > 255) {
    errors.push('Case name must be less than 255 characters');
  }

  // Optional fields validation
  const numericFields = ['past_medical_bills', 'future_medical_bills', 'lcp', 'lost_wages', 'loss_earning_capacity',
    'primary_coverage_limit', 'umbrella_coverage_limit', 'uim_coverage_limit',
    'medical_specials', 'economic_damages', 'non_economic_damages', 'policy_limits'];
  for (const field of numericFields) {
    if (data[field] !== undefined && data[field] !== null && data[field] !== '') {
      const val = parseFloat(data[field]);
      if (isNaN(val) || val < 0) {
        errors.push(`${field} must be a valid positive number`);
      }
    }
  }

  // Validate liability percentage (0-100)
  if (data.liability_percentage !== undefined && data.liability_percentage !== null && data.liability_percentage !== '') {
    const val = parseFloat(data.liability_percentage);
    if (isNaN(val) || val < 0 || val > 100) {
      errors.push('liability_percentage must be between 0 and 100');
    }
  }

  const stringFields = ['plaintiff_attorney', 'defendant_attorney', 'mediator', 'venue', 'judge', 'coverage', 'defendant_type', 'injury_description',
    'primary_insurer_name', 'primary_adjuster_name', 'umbrella_insurer_name', 'umbrella_adjuster_name',
    'uim_insurer_name', 'uim_adjuster_name', 'evaluation_notes'];
  for (const field of stringFields) {
    if (data[field] && typeof data[field] !== 'string') {
      errors.push(`${field} must be a string`);
    }
    if (data[field] && data[field].length > 1000) {
      errors.push(`${field} must be less than 1000 characters`);
    }
  }

  if (data.status && !['active', 'settled', 'closed', 'withdrawn'].includes(data.status)) {
    errors.push('Invalid status value');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate move (offer/demand) data
 */
function validateMove(data) {
  const errors = [];

  if (!data.negotiation_id || typeof data.negotiation_id !== 'number') {
    errors.push('negotiation_id is required and must be a number');
  }

  if (!data.party || !['plaintiff', 'defendant', 'mediator'].includes(data.party)) {
    errors.push('party must be one of: plaintiff, defendant, mediator');
  }

  if (!data.type || !['demand', 'offer'].includes(data.type)) {
    errors.push('type must be either "demand" or "offer"');
  }

  if (data.amount === undefined || data.amount === null) {
    errors.push('amount is required');
  } else {
    const val = parseFloat(data.amount);
    if (isNaN(val) || val < 0) {
      errors.push('amount must be a valid positive number');
    }
  }

  if (data.notes && typeof data.notes !== 'string') {
    errors.push('notes must be a string');
  }

  if (data.notes && data.notes.length > 2000) {
    errors.push('notes must be less than 2000 characters');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize string input (basic XSS prevention)
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .trim();
}

/**
 * Sanitize negotiation data
 */
function sanitizeNegotiation(data) {
  return {
    name: data.name ? sanitizeString(data.name) : '',
    plaintiff_attorney: data.plaintiff_attorney ? sanitizeString(data.plaintiff_attorney) : '',
    defendant_attorney: data.defendant_attorney ? sanitizeString(data.defendant_attorney) : '',
    mediator: data.mediator ? sanitizeString(data.mediator) : '',
    venue: data.venue ? sanitizeString(data.venue) : '',
    judge: data.judge ? sanitizeString(data.judge) : '',
    coverage: data.coverage ? sanitizeString(data.coverage) : '',
    primary_coverage_limit: parseFloat(data.primary_coverage_limit) || null,
    primary_insurer_name: data.primary_insurer_name ? sanitizeString(data.primary_insurer_name) : '',
    primary_adjuster_name: data.primary_adjuster_name ? sanitizeString(data.primary_adjuster_name) : '',
    umbrella_coverage_limit: parseFloat(data.umbrella_coverage_limit) || null,
    umbrella_insurer_name: data.umbrella_insurer_name ? sanitizeString(data.umbrella_insurer_name) : '',
    umbrella_adjuster_name: data.umbrella_adjuster_name ? sanitizeString(data.umbrella_adjuster_name) : '',
    uim_coverage_limit: parseFloat(data.uim_coverage_limit) || null,
    uim_insurer_name: data.uim_insurer_name ? sanitizeString(data.uim_insurer_name) : '',
    uim_adjuster_name: data.uim_adjuster_name ? sanitizeString(data.uim_adjuster_name) : '',
    defendant_type: data.defendant_type ? sanitizeString(data.defendant_type) : '',
    injury_description: data.injury_description ? sanitizeString(data.injury_description) : '',
    past_medical_bills: parseFloat(data.past_medical_bills) || 0,
    future_medical_bills: parseFloat(data.future_medical_bills) || 0,
    lcp: parseFloat(data.lcp) || 0,
    lost_wages: parseFloat(data.lost_wages) || 0,
    loss_earning_capacity: parseFloat(data.loss_earning_capacity) || 0,
    status: data.status || 'active',
    // Evaluation fields
    medical_specials: parseFloat(data.medical_specials) || null,
    economic_damages: parseFloat(data.economic_damages) || null,
    non_economic_damages: parseFloat(data.non_economic_damages) || null,
    policy_limits: parseFloat(data.policy_limits) || null,
    liability_percentage: parseFloat(data.liability_percentage) || null,
    evaluation_notes: data.evaluation_notes ? sanitizeString(data.evaluation_notes) : ''
  };
}

/**
 * Sanitize move data
 */
function sanitizeMove(data) {
  return {
    negotiation_id: parseInt(data.negotiation_id),
    party: data.party,
    type: data.type,
    amount: parseFloat(data.amount),
    notes: data.notes ? sanitizeString(data.notes) : ''
  };
}

/**
 * Validate bracket proposal
 */
function validateBracket(data) {
  const errors = [];

  if (!data.negotiation_id || isNaN(parseInt(data.negotiation_id))) {
    errors.push('Valid negotiation_id is required');
  }

  // Single-value model: plaintiff_amount and defendant_amount
  const numericFields = ['plaintiff_amount', 'defendant_amount'];
  for (const field of numericFields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} is required`);
    } else {
      const val = parseFloat(data[field]);
      if (isNaN(val) || val < 0) {
        errors.push(`${field} must be a valid positive number`);
      }
    }
  }

  // Validate proposed_by field
  if (data.proposed_by && !['plaintiff', 'defendant'].includes(data.proposed_by)) {
    errors.push('proposed_by must be either "plaintiff" or "defendant"');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate mediator proposal
 */
function validateMediatorProposal(data) {
  const errors = [];

  if (!data.negotiation_id || isNaN(parseInt(data.negotiation_id))) {
    errors.push('Valid negotiation_id is required');
  }

  if (!data.amount || isNaN(parseFloat(data.amount)) || parseFloat(data.amount) <= 0) {
    errors.push('Amount must be a positive number');
  }

  if (!data.deadline) {
    errors.push('Deadline is required');
  } else {
    const deadline = new Date(data.deadline);
    if (isNaN(deadline.getTime())) {
      errors.push('Deadline must be a valid ISO datetime');
    } else if (deadline <= new Date()) {
      errors.push('Deadline must be in the future');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize bracket data
 */
function sanitizeBracket(data) {
  return {
    negotiation_id: parseInt(data.negotiation_id),
    plaintiff_amount: parseFloat(data.plaintiff_amount),
    defendant_amount: parseFloat(data.defendant_amount),
    notes: data.notes ? sanitizeString(data.notes) : '',
    proposed_by: data.proposed_by || 'plaintiff' // Default to 'plaintiff' for backward compatibility
  };
}

/**
 * Sanitize mediator proposal
 */
function sanitizeMediatorProposal(data) {
  return {
    negotiation_id: parseInt(data.negotiation_id),
    amount: parseFloat(data.amount),
    deadline: new Date(data.deadline).toISOString(),
    notes: data.notes ? sanitizeString(data.notes) : ''
  };
}

module.exports = {
  validateNegotiationCreate,
  validateNegotiationUpdate,
  validateNegotiation,
  validateMove,
  validateBracket,
  validateMediatorProposal,
  sanitizeString,
  sanitizeNegotiation,
  sanitizeMove,
  sanitizeBracket,
  sanitizeMediatorProposal
};
