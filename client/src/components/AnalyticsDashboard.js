import React from 'react';
import '../styles/AnalyticsDashboard.css';

function AnalyticsDashboard({ analytics, moves }) {
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
    </div>
  );
}

export default AnalyticsDashboard;
