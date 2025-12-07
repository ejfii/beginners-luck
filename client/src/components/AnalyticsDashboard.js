import React from 'react';
import '../styles/AnalyticsDashboard.css';

function AnalyticsDashboard({ analytics, moves, negotiation }) {
  if (!analytics || moves?.length === 0) {
    return (
      <div className="analytics-dashboard">
        <h3>Analytics</h3>
        <p className="empty-message">Add moves to see analytics</p>
      </div>
    );
  }

  const formatCurrency = (value) => {
    if (value === null || value === undefined) return 'N/A';
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  // Calculate evaluation-based metrics if data is available
  const hasEvaluation = negotiation && (
    negotiation.medical_specials != null || 
    negotiation.economic_damages != null || 
    negotiation.non_economic_damages != null ||
    negotiation.liability_percentage != null
  );

  let evaluationMetrics = null;
  if (hasEvaluation) {
    const medicalSpecials = negotiation.medical_specials || 0;
    const economicDamages = negotiation.economic_damages || 0;
    const nonEconomicDamages = negotiation.non_economic_damages || 0;
    const totalDamages = medicalSpecials + economicDamages + nonEconomicDamages;
    const liabilityPercentage = negotiation.liability_percentage != null ? negotiation.liability_percentage : 100;
    const adjustedValue = totalDamages * (liabilityPercentage / 100);
    const policyLimit = negotiation.policy_limits || negotiation.primary_coverage_limit;
    
    // Settlement range: 60-90% of adjusted value, capped by policy limits
    const settlementLow = adjustedValue * 0.6;
    const settlementHigh = Math.min(adjustedValue * 0.9, policyLimit || adjustedValue * 0.9);
    
    // Policy limit utilization (if policy limit exists and predicted settlement available)
    let policyUtilization = null;
    if (policyLimit && analytics.predicted_settlement) {
      policyUtilization = (analytics.predicted_settlement / policyLimit) * 100;
    }
    
    evaluationMetrics = {
      totalDamages,
      adjustedValue,
      settlementLow,
      settlementHigh,
      liabilityPercentage,
      policyLimit,
      policyUtilization
    };
  }

  const getMomentumColor = (momentum) => {
    if (momentum > 50) return 'positive';
    if (momentum > 0) return 'neutral';
    return 'negative';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence > 70) return 'high';
    if (confidence > 40) return 'medium';
    return 'low';
  };

  return (
    <div className="analytics-dashboard">
      <h3>Analytics & Predictions</h3>

      {/* Evaluation-Based Metrics Section */}
      {evaluationMetrics && (
        <div className="evaluation-metrics-section">
          <h4 className="section-title">Case Evaluation Metrics</h4>
          <div className="metrics-grid">
            <div className="metric-card evaluation-metric">
              <h4>Total Damages</h4>
              <div className="metric-value">
                {formatCurrency(evaluationMetrics.totalDamages)}
              </div>
              <p className="metric-description">Medical + Economic + Non-Economic</p>
            </div>

            <div className="metric-card evaluation-metric">
              <h4>Liability Factor</h4>
              <div className="metric-value">
                {evaluationMetrics.liabilityPercentage}%
              </div>
              <p className="metric-description">Applied to total damages</p>
            </div>

            <div className="metric-card evaluation-metric highlight">
              <h4>Adjusted Case Value</h4>
              <div className="metric-value">
                {formatCurrency(evaluationMetrics.adjustedValue)}
              </div>
              <p className="metric-description">Total damages × liability</p>
            </div>

            <div className="metric-card evaluation-metric">
              <h4>Projected Range</h4>
              <div className="metric-value metric-value-small">
                {formatCurrency(evaluationMetrics.settlementLow)} - {formatCurrency(evaluationMetrics.settlementHigh)}
              </div>
              <p className="metric-description">60-90% of adjusted value</p>
            </div>

            {evaluationMetrics.policyLimit && (
              <div className="metric-card evaluation-metric">
                <h4>Policy Limit</h4>
                <div className="metric-value">
                  {formatCurrency(evaluationMetrics.policyLimit)}
                </div>
                <p className="metric-description">Settlement cap</p>
              </div>
            )}

            {evaluationMetrics.policyUtilization != null && (
              <div className={`metric-card evaluation-metric ${evaluationMetrics.policyUtilization > 80 ? 'warning' : ''}`}>
                <h4>Policy Utilization</h4>
                <div className="metric-value">
                  {evaluationMetrics.policyUtilization.toFixed(1)}%
                </div>
                <p className="metric-description">
                  {evaluationMetrics.policyUtilization > 80 ? 'Near policy limit' : 'Of predicted settlement'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Negotiation Analytics Section */}
      <h4 className="section-title">Negotiation Analytics</h4>
      <div className="metrics-grid">
        <div className="metric-card">
          <h4>Current Midpoint</h4>
          <div className="metric-value">
            {formatCurrency(analytics.midpoint)}
          </div>
          <p className="metric-description">Average of latest demand/offer</p>
        </div>

        <div className="metric-card">
          <h4>Midpoint of Midpoints</h4>
          <div className="metric-value">
            {formatCurrency(analytics.midpoint_of_midpoints)}
          </div>
          <p className="metric-description">Historical average midpoint</p>
        </div>

        <div className={`metric-card momentum-${getMomentumColor(analytics.momentum)}`}>
          <h4>Momentum</h4>
          <div className="metric-value">
            {analytics.momentum?.toFixed(1)}%
          </div>
          <p className="metric-description">Rate of convergence</p>
        </div>

        <div className="metric-card">
          <h4>Convergence Rate</h4>
          <div className="metric-value">
            {analytics.convergence_rate?.toFixed(1)}%
          </div>
          <p className="metric-description">Gap reduction progress</p>
        </div>

        <div className="metric-card">
          <h4>Predicted Settlement</h4>
          <div className="metric-value">
            {formatCurrency(analytics.predicted_settlement)}
          </div>
          <p className="metric-description">AI-powered estimate</p>
        </div>

        <div className={`metric-card confidence-${getConfidenceColor(analytics.confidence)}`}>
          <h4>Prediction Confidence</h4>
          <div className="metric-value">
            {analytics.confidence?.toFixed(1)}%
          </div>
          <p className="metric-description">Reliability of prediction</p>
        </div>
      </div>

      {/* Evaluation vs Prediction Comparison */}
      {evaluationMetrics && analytics.predicted_settlement && (
        <div className="comparison-section">
          <h4 className="section-title">Evaluation vs Prediction</h4>
          <div className="comparison-content">
            {analytics.predicted_settlement >= evaluationMetrics.settlementLow && 
             analytics.predicted_settlement <= evaluationMetrics.settlementHigh ? (
              <p className="comparison-text success">
                ✓ Predicted settlement ({formatCurrency(analytics.predicted_settlement)}) falls within 
                the projected evaluation range ({formatCurrency(evaluationMetrics.settlementLow)} - {formatCurrency(evaluationMetrics.settlementHigh)}).
              </p>
            ) : analytics.predicted_settlement < evaluationMetrics.settlementLow ? (
              <p className="comparison-text warning">
                ⚠ Predicted settlement ({formatCurrency(analytics.predicted_settlement)}) is below 
                the evaluation range ({formatCurrency(evaluationMetrics.settlementLow)} - {formatCurrency(evaluationMetrics.settlementHigh)}). 
                Consider pushing harder for higher settlement.
              </p>
            ) : (
              <p className="comparison-text info">
                ↑ Predicted settlement ({formatCurrency(analytics.predicted_settlement)}) exceeds 
                the evaluation range ({formatCurrency(evaluationMetrics.settlementLow)} - {formatCurrency(evaluationMetrics.settlementHigh)}). 
                Strong negotiation position.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
