import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/EvaluationPanel.css';
import { useMoneyInput } from '../hooks/useMoneyInput';
import { formatMoney } from '../utils/money';

function EvaluationPanel({ negotiation, token, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Evaluation fields
  const [medicalSpecials, setMedicalSpecials] = useState(negotiation?.medical_specials || null);
  const [economicDamages, setEconomicDamages] = useState(negotiation?.economic_damages || null);
  const [nonEconomicDamages, setNonEconomicDamages] = useState(negotiation?.non_economic_damages || null);
  const [policyLimits, setPolicyLimits] = useState(negotiation?.policy_limits || null);
  const [liabilityPercentage, setLiabilityPercentage] = useState(negotiation?.liability_percentage || null);
  const [juryDamagesLikelihood, setJuryDamagesLikelihood] = useState(negotiation?.jury_damages_likelihood || null);
  const [evaluationNotes, setEvaluationNotes] = useState(negotiation?.evaluation_notes || '');
  
  // Money input handlers
  const medicalInput = useMoneyInput(medicalSpecials, setMedicalSpecials);
  const economicInput = useMoneyInput(economicDamages, setEconomicDamages);
  const nonEconomicInput = useMoneyInput(nonEconomicDamages, setNonEconomicDamages);
  const policyLimitsInput = useMoneyInput(policyLimits, setPolicyLimits);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  // Update local state when negotiation changes
  useEffect(() => {
    if (negotiation) {
      setMedicalSpecials(negotiation.medical_specials || null);
      setEconomicDamages(negotiation.economic_damages || null);
      setNonEconomicDamages(negotiation.non_economic_damages || null);
      setPolicyLimits(negotiation.policy_limits || null);
      setLiabilityPercentage(negotiation.liability_percentage || null);
      setJuryDamagesLikelihood(negotiation.jury_damages_likelihood || null);
      setEvaluationNotes(negotiation.evaluation_notes || '');
    }
  }, [negotiation]);

  const calculateTotalDamages = () => {
    const medical = parseFloat(medicalSpecials) || 0;
    const economic = parseFloat(economicDamages) || 0;
    const nonEconomic = parseFloat(nonEconomicDamages) || 0;
    return medical + economic + nonEconomic;
  };

  const calculateAdjustedValue = () => {
    const total = calculateTotalDamages();
    const liability = parseFloat(liabilityPercentage) || 100;
    return total * (liability / 100);
  };

  const calculateSettlementRange = () => {
    const adjustedValue = calculateAdjustedValue();
    const policy = parseFloat(policyLimits) || Infinity;
    
    // Settlement range: 60% to 90% of adjusted value, capped by policy limits
    const lowEnd = Math.min(adjustedValue * 0.6, policy);
    const highEnd = Math.min(adjustedValue * 0.9, policy);
    
    return { lowEnd, highEnd };
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);

    try {
      const updates = {
        medical_specials: medicalSpecials,
        economic_damages: economicDamages,
        non_economic_damages: nonEconomicDamages,
        policy_limits: policyLimits,
        liability_percentage: liabilityPercentage,
        jury_damages_likelihood: juryDamagesLikelihood,
        evaluation_notes: evaluationNotes
      };

      const response = await axios.put(
        `${API_BASE_URL}/negotiations/${negotiation.id}`,
        updates,
        getAxiosConfig()
      );

      setIsEditing(false);
      if (onUpdate) {
        onUpdate(response.data);
      }
    } catch (err) {
      console.error('Error updating evaluation:', err);
      setError(err.response?.data?.error || 'Failed to update evaluation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Reset to original values
    setMedicalSpecials(negotiation?.medical_specials || null);
    setEconomicDamages(negotiation?.economic_damages || null);
    setNonEconomicDamages(negotiation?.non_economic_damages || null);
    setPolicyLimits(negotiation?.policy_limits || null);
    setLiabilityPercentage(negotiation?.liability_percentage || null);
    setJuryDamagesLikelihood(negotiation?.jury_damages_likelihood || null);
    setEvaluationNotes(negotiation?.evaluation_notes || '');
    setIsEditing(false);
    setError(null);
  };

  const hasEvaluationData = () => {
    return medicalSpecials || economicDamages || nonEconomicDamages || 
           policyLimits || liabilityPercentage || juryDamagesLikelihood || evaluationNotes;
  };

  const getJuryLikelihoodLabel = (percentage) => {
    if (!percentage) return '';
    const val = parseInt(percentage);
    if (val <= 25) return 'Low likelihood';
    if (val <= 60) return 'Moderate likelihood';
    return 'High likelihood';
  };

  const totalDamages = calculateTotalDamages();
  const adjustedValue = calculateAdjustedValue();
  const settlementRange = calculateSettlementRange();

  return (
    <div className="evaluation-panel">
      <div className="evaluation-header">
        <h3>📊 Case Evaluation</h3>
        {!isEditing && (
          <button 
            className="btn-edit-evaluation"
            onClick={() => setIsEditing(true)}
          >
            {hasEvaluationData() ? '✏️ Edit' : '➕ Add Evaluation'}
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {!hasEvaluationData() && !isEditing ? (
        <div className="evaluation-empty">
          <p>No evaluation data yet. Click &ldquo;Add Evaluation&rdquo; to get started.</p>
        </div>
      ) : (
        <>
          <div className="evaluation-form">
            {/* Damages Section */}
            <div className="evaluation-section">
              <h4>💰 Damages Breakdown</h4>
              
              <div className="form-row">
                <label>Medical Specials:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={medicalInput.displayValue}
                    onChange={medicalInput.onChange}
                    onBlur={medicalInput.onBlur}
                    placeholder="e.g., 50k or 50000"
                    className={medicalInput.error ? 'input-error' : ''}
                  />
                ) : (
                  <span className="value-display">
                    {medicalSpecials ? formatMoney(medicalSpecials) : '—'}
                  </span>
                )}
              </div>
              {medicalInput.error && <div className="input-error-msg">{medicalInput.error}</div>}

              <div className="form-row">
                <label>Economic Damages (Lost Wages, etc.):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={economicInput.displayValue}
                    onChange={economicInput.onChange}
                    onBlur={economicInput.onBlur}
                    placeholder="e.g., 25k or 25000"
                    className={economicInput.error ? 'input-error' : ''}
                  />
                ) : (
                  <span className="value-display">
                    {economicDamages ? formatMoney(economicDamages) : '—'}
                  </span>
                )}
              </div>
              {economicInput.error && <div className="input-error-msg">{economicInput.error}</div>}

              <div className="form-row">
                <label>Non-Economic Damages (Pain & Suffering):</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={nonEconomicInput.displayValue}
                    onChange={nonEconomicInput.onChange}
                    onBlur={nonEconomicInput.onBlur}
                    placeholder="e.g., 100k or 100000"
                    className={nonEconomicInput.error ? 'input-error' : ''}
                  />
                ) : (
                  <span className="value-display">
                    {nonEconomicDamages ? formatMoney(nonEconomicDamages) : '—'}
                  </span>
                )}
              </div>
              {nonEconomicInput.error && <div className="input-error-msg">{nonEconomicInput.error}</div>}

              <div className="form-row total-row">
                <label><strong>Total Damages:</strong></label>
                <span className="value-display total-value">
                  {totalDamages > 0 ? formatMoney(totalDamages) : '—'}
                </span>
              </div>
            </div>

            {/* Liability & Policy Section */}
            <div className="evaluation-section">
              <h4>⚖️ Liability & Policy</h4>
              
              <div className="form-row">
                <label>Liability Assessment (%):</label>
                {isEditing ? (
                  <div className="liability-input-group">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={liabilityPercentage || ''}
                      onChange={(e) => setLiabilityPercentage(e.target.value)}
                      placeholder="0-100"
                      className="liability-input"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={liabilityPercentage || 50}
                      onChange={(e) => setLiabilityPercentage(e.target.value)}
                      className="liability-slider"
                    />
                  </div>
                ) : (
                  <span className="value-display">
                    {liabilityPercentage ? `${liabilityPercentage}%` : '—'}
                  </span>
                )}
              </div>

              <div className="form-row">
                <label>Policy Limits:</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={policyLimitsInput.displayValue}
                    onChange={policyLimitsInput.onChange}
                    onBlur={policyLimitsInput.onBlur}
                    placeholder="e.g., 250k or 250000"
                    className={policyLimitsInput.error ? 'input-error' : ''}
                  />
                ) : (
                  <span className="value-display">
                    {policyLimits ? formatMoney(policyLimits) : '—'}
                  </span>
                )}
              </div>
              {policyLimitsInput.error && <div className="input-error-msg">{policyLimitsInput.error}</div>}

              <div className="form-row">
                <label>Jury Damages Likelihood (%):</label>
                {isEditing ? (
                  <div className="liability-input-group">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="5"
                      value={juryDamagesLikelihood || ''}
                      onChange={(e) => setJuryDamagesLikelihood(e.target.value)}
                      placeholder="0-100"
                      className="liability-input"
                    />
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="5"
                      value={juryDamagesLikelihood || 50}
                      onChange={(e) => setJuryDamagesLikelihood(e.target.value)}
                      className="liability-slider"
                    />
                    {juryDamagesLikelihood && (
                      <span className="percentage-label">
                        {juryDamagesLikelihood}% - {getJuryLikelihoodLabel(juryDamagesLikelihood)}
                      </span>
                    )}
                  </div>
                ) : (
                  <span className="value-display">
                    {juryDamagesLikelihood ? (
                      <>
                        {juryDamagesLikelihood}% - {getJuryLikelihoodLabel(juryDamagesLikelihood)}
                      </>
                    ) : '—'}
                  </span>
                )}
              </div>

              <div className="form-row total-row">
                <label><strong>Adjusted Case Value:</strong></label>
                <span className="value-display total-value">
                  {adjustedValue > 0 ? formatMoney(adjustedValue) : '—'}
                </span>
              </div>
            </div>

            {/* Settlement Range */}
            {adjustedValue > 0 && (
              <div className="evaluation-section settlement-range-section">
                <h4>🎯 Projected Settlement Range</h4>
                <div className="settlement-range">
                  <div className="range-bar">
                    <div className="range-fill"></div>
                    <div className="range-labels">
                      <span className="range-low">{formatMoney(settlementRange.lowEnd)}</span>
                      <span className="range-high">{formatMoney(settlementRange.highEnd)}</span>
                    </div>
                  </div>
                  <p className="range-explanation">
                    Based on {liabilityPercentage || 100}% liability
                    {policyLimits && adjustedValue * 0.9 > policyLimits && 
                      ' (capped by policy limits)'}
                  </p>
                  {juryDamagesLikelihood && (
                    <div className="jury-assessment">
                      <h5>⚖️ Jury Damages Assessment</h5>
                      <p className="jury-explanation">
                        <strong>Likelihood jury awards claimed damages: {juryDamagesLikelihood}%</strong>
                        <br />
                        <span className="jury-risk-note">
                          {getJuryLikelihoodLabel(juryDamagesLikelihood)} - Consider this when setting conservative settlement targets. 
                          A {juryDamagesLikelihood}% likelihood suggests a jury-adjusted range of approximately{' '}
                          {formatMoney(settlementRange.lowEnd * (juryDamagesLikelihood / 100))} to{' '}
                          {formatMoney(settlementRange.highEnd * (juryDamagesLikelihood / 100))} in risk-averse scenarios.
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Notes Section */}
            <div className="evaluation-section">
              <h4>📝 Evaluation Notes</h4>
              {isEditing ? (
                <textarea
                  value={evaluationNotes}
                  onChange={(e) => setEvaluationNotes(e.target.value)}
                  placeholder="Enter your evaluation rationale, strengths/weaknesses, jury appeal considerations, etc."
                  rows="4"
                  className="evaluation-notes"
                />
              ) : (
                <div className="notes-display">
                  {evaluationNotes || <em>No notes added</em>}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="evaluation-actions">
              <button 
                className="btn-cancel"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn-save"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : '💾 Save Evaluation'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default EvaluationPanel;
