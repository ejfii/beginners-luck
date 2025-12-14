import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import '../styles/EvaluationPanel.css';
import { useMoneyInput } from '../hooks/useMoneyInput';
import { formatMoney } from '../utils/money';

function EvaluationPanel({ negotiation, token, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);
  const [showCalculationBreakdown, setShowCalculationBreakdown] = useState(false);
  const [showTooltip, setShowTooltip] = useState(null);
  const [showDraftRestore, setShowDraftRestore] = useState(false);
  const [draftData, setDraftData] = useState(null);
  
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

  // Auto-save drafts to localStorage
  useEffect(() => {
    if (isEditing && negotiation?.id) {
      const draftKey = `evaluation_draft_${negotiation.id}`;
      const draftData = {
        medicalSpecials,
        economicDamages,
        nonEconomicDamages,
        policyLimits,
        liabilityPercentage,
        juryDamagesLikelihood,
        evaluationNotes,
        timestamp: Date.now()
      };
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    }
  }, [isEditing, medicalSpecials, economicDamages, nonEconomicDamages, policyLimits, liabilityPercentage, juryDamagesLikelihood, evaluationNotes, negotiation?.id]);

  // Check for draft when entering edit mode
  const handleStartEditing = () => {
    if (negotiation?.id) {
      const draftKey = `evaluation_draft_${negotiation.id}`;
      const draftStr = localStorage.getItem(draftKey);
      if (draftStr) {
        try {
          const draft = JSON.parse(draftStr);
          const draftAge = Date.now() - draft.timestamp;
          if (draftAge < 24 * 60 * 60 * 1000) {
            // Draft exists and is recent - offer to restore
            setDraftData(draft);
            setShowDraftRestore(true);
          } else {
            // Clear old draft
            localStorage.removeItem(draftKey);
          }
        } catch (e) {
          // Invalid draft, remove it
          localStorage.removeItem(draftKey);
        }
      }
    }
    setIsEditing(true);
  };

  const handleRestoreDraft = () => {
    if (draftData) {
      setMedicalSpecials(draftData.medicalSpecials);
      setEconomicDamages(draftData.economicDamages);
      setNonEconomicDamages(draftData.nonEconomicDamages);
      setPolicyLimits(draftData.policyLimits);
      setLiabilityPercentage(draftData.liabilityPercentage);
      setJuryDamagesLikelihood(draftData.juryDamagesLikelihood);
      setEvaluationNotes(draftData.evaluationNotes);
    }
    setShowDraftRestore(false);
    setDraftData(null);
  };

  const handleDiscardDraft = () => {
    clearDraft();
    setShowDraftRestore(false);
    setDraftData(null);
  };

  // Clear draft after successful save
  const clearDraft = () => {
    if (negotiation?.id) {
      const draftKey = `evaluation_draft_${negotiation.id}`;
      localStorage.removeItem(draftKey);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && isEditing) {
        e.preventDefault();
        if (!loading) {
          handleSave();
        }
      }
      // Esc to cancel
      if (e.key === 'Escape' && isEditing) {
        e.preventDefault();
        handleCancel();
      }
      // Ctrl/Cmd + E to edit
      if ((e.ctrlKey || e.metaKey) && e.key === 'e' && !isEditing && hasEvaluationData()) {
        e.preventDefault();
        handleStartEditing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditing, loading]);

  // Field tooltips data
  const fieldTooltips = {
    medicalSpecials: 'Past medical expenses, hospital bills, and treatment costs. Enter as number (e.g., 50000) or shorthand (e.g., 50k).',
    economicDamages: 'Lost wages, loss of earning capacity, and other economic losses. Enter as number or shorthand.',
    nonEconomicDamages: 'Pain and suffering, emotional distress, loss of enjoyment of life. Typically the largest component. Enter as number or shorthand.',
    policyLimits: 'The maximum amount the insurance policy will pay. Settlement range will be capped by this amount.',
    liabilityPercentage: 'Your assessment of the defendant\'s liability (0-100%). This percentage is applied to total damages to calculate adjusted case value.',
    juryDamagesLikelihood: 'Likelihood that a jury would award the full claimed damages (0-100%). Higher values suggest more conservative settlement targets.'
  };

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
      clearDraft(); // Clear draft after successful save
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
    clearDraft(); // Clear draft on cancel
  };

  // Helper component for field label with tooltip
  const FieldLabel = ({ field, children }) => {
    const tooltip = fieldTooltips[field];
    if (!tooltip) return <label>{children}</label>;
    
    return (
      <label className="field-label-with-tooltip">
        {children}
        <span
          className="tooltip-icon"
          onMouseEnter={() => setShowTooltip(field)}
          onMouseLeave={() => setShowTooltip(null)}
          onClick={() => setShowTooltip(showTooltip === field ? null : field)}
        >
          ℹ️
        </span>
        {showTooltip === field && (
          <div className="tooltip-content">
            {tooltip}
          </div>
        )}
      </label>
    );
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

  // Smart Validation & Warnings
  const getValidationWarnings = () => {
    const warnings = [];
    
    if (policyLimits && adjustedValue > 0) {
      const highEnd = Math.min(adjustedValue * 0.9, parseFloat(policyLimits) || Infinity);
      if (highEnd >= parseFloat(policyLimits) * 0.95) {
        warnings.push({
          type: 'warning',
          message: 'Settlement range is very close to policy limits. Consider policy limit constraints in negotiations.'
        });
      }
    }
    
    if (liabilityPercentage && juryDamagesLikelihood) {
      const liability = parseFloat(liabilityPercentage);
      const jury = parseFloat(juryDamagesLikelihood);
      if (liability < 50 && jury > 70) {
        warnings.push({
          type: 'warning',
          message: 'Low liability percentage but high jury likelihood may indicate inconsistent assessment.'
        });
      }
    }
    
    if (policyLimits && adjustedValue > 0) {
      const policy = parseFloat(policyLimits);
      if (policy < adjustedValue * 0.6) {
        warnings.push({
          type: 'error',
          message: 'Policy limits are below the low end of settlement range. This may limit recovery.'
        });
      }
    }
    
    return warnings;
  };

  // Calculate recommended settlement amount
  const calculateRecommendedSettlement = () => {
    if (adjustedValue <= 0) return null;
    
    const settlementRange = calculateSettlementRange();
    const midpoint = (settlementRange.lowEnd + settlementRange.highEnd) / 2;
    
    // Adjust based on jury likelihood if available
    if (juryDamagesLikelihood) {
      const juryAdjustment = parseFloat(juryDamagesLikelihood) / 100;
      // Weighted average: 70% midpoint, 30% jury-adjusted
      const juryAdjusted = midpoint * juryAdjustment;
      return midpoint * 0.7 + juryAdjusted * 0.3;
    }
    
    return midpoint;
  };

  // Scenario comparison calculations
  const calculateScenario = (scenarioData) => {
    const medical = parseFloat(scenarioData.medicalSpecials) || 0;
    const economic = parseFloat(scenarioData.economicDamages) || 0;
    const nonEconomic = parseFloat(scenarioData.nonEconomicDamages) || 0;
    const total = medical + economic + nonEconomic;
    const liability = parseFloat(scenarioData.liabilityPercentage) || 100;
    const adjusted = total * (liability / 100);
    const policy = parseFloat(scenarioData.policyLimits) || Infinity;
    const lowEnd = Math.min(adjusted * 0.6, policy);
    const highEnd = Math.min(adjusted * 0.9, policy);
    
    let juryAdjusted = null;
    if (scenarioData.juryDamagesLikelihood) {
      const juryLikelihood = parseFloat(scenarioData.juryDamagesLikelihood) / 100;
      juryAdjusted = {
        lowEnd: lowEnd * juryLikelihood,
        highEnd: highEnd * juryLikelihood
      };
    }
    
    return {
      totalDamages: total,
      adjustedValue: adjusted,
      settlementRange: { lowEnd, highEnd },
      juryAdjusted
    };
  };

  const totalDamages = calculateTotalDamages();
  const adjustedValue = calculateAdjustedValue();
  const settlementRange = calculateSettlementRange();
  const validationWarnings = getValidationWarnings();
  const recommendedSettlement = calculateRecommendedSettlement();
  
  // Scenario comparison state - initialize with current values
  const [scenarioData, setScenarioData] = useState({
    medicalSpecials: null,
    economicDamages: null,
    nonEconomicDamages: null,
    policyLimits: null,
    liabilityPercentage: null,
    juryDamagesLikelihood: null
  });
  
  // Initialize scenario data when opening comparison
  const handleOpenScenarioComparison = () => {
    const initialScenarioData = {
      medicalSpecials: medicalSpecials,
      economicDamages: economicDamages,
      nonEconomicDamages: nonEconomicDamages,
      policyLimits: policyLimits,
      liabilityPercentage: liabilityPercentage,
      juryDamagesLikelihood: juryDamagesLikelihood
    };
    setScenarioData(initialScenarioData);
    setShowScenarioComparison(true);
  };
  
  const currentScenario = calculateScenario({
    medicalSpecials,
    economicDamages,
    nonEconomicDamages,
    policyLimits,
    liabilityPercentage,
    juryDamagesLikelihood
  });

  return (
    <div className="evaluation-panel">
      <div className="evaluation-header">
        <h3>📊 Case Evaluation</h3>
        {!isEditing && hasEvaluationData() && (
          <div className="header-actions">
            <button 
              className="btn-compare-scenarios"
              onClick={handleOpenScenarioComparison}
              title="Compare different evaluation scenarios"
            >
              🔄 Compare Scenarios
            </button>
            <button 
              className="btn-edit-evaluation"
              onClick={handleStartEditing}
            >
              ✏️ Edit
            </button>
          </div>
        )}
        {!isEditing && !hasEvaluationData() && (
          <button 
            className="btn-edit-evaluation"
            onClick={handleStartEditing}
          >
            ➕ Add Evaluation
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* Draft Restore Prompt */}
      {showDraftRestore && (
        <div className="draft-restore-prompt">
          <div className="draft-restore-content">
            <span className="draft-icon">💾</span>
            <div className="draft-restore-text">
              <strong>Unsaved draft found</strong>
              <p>You have an unsaved draft from a previous editing session. Would you like to restore it?</p>
            </div>
            <div className="draft-restore-actions">
              <button className="btn-restore-draft" onClick={handleRestoreDraft}>
                Restore Draft
              </button>
              <button className="btn-discard-draft" onClick={handleDiscardDraft}>
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validationWarnings.length > 0 && (
        <div className="validation-warnings">
          {validationWarnings.map((warning, index) => (
            <div key={index} className={`validation-warning validation-warning-${warning.type}`}>
              <span className="warning-icon">{warning.type === 'error' ? '⚠️' : 'ℹ️'}</span>
              <span className="warning-message">{warning.message}</span>
            </div>
          ))}
        </div>
      )}

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
                <FieldLabel field="medicalSpecials">Medical Specials:</FieldLabel>
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
                <FieldLabel field="economicDamages">Economic Damages (Lost Wages, etc.):</FieldLabel>
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
                <FieldLabel field="nonEconomicDamages">Non-Economic Damages (Pain & Suffering):</FieldLabel>
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
                <FieldLabel field="liabilityPercentage">Liability Assessment (%):</FieldLabel>
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
                <FieldLabel field="policyLimits">Policy Limits:</FieldLabel>
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
                <FieldLabel field="juryDamagesLikelihood">Jury Damages Likelihood (%):</FieldLabel>
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
                <div className="section-header-with-action">
                  <h4>🎯 Projected Settlement Range</h4>
                  <button
                    className="btn-show-breakdown"
                    onClick={() => setShowCalculationBreakdown(!showCalculationBreakdown)}
                    type="button"
                  >
                    {showCalculationBreakdown ? '▼ Hide' : '▶ Show'} Calculation Details
                  </button>
                </div>
                {showCalculationBreakdown && (
                  <div className="calculation-breakdown">
                    <h5>Calculation Breakdown</h5>
                    <div className="breakdown-step">
                      <strong>Step 1: Total Damages</strong>
                      <div className="breakdown-formula">
                        Medical Specials + Economic Damages + Non-Economic Damages
                      </div>
                      <div className="breakdown-calculation">
                        {formatMoney(parseFloat(medicalSpecials) || 0)} + {formatMoney(parseFloat(economicDamages) || 0)} + {formatMoney(parseFloat(nonEconomicDamages) || 0)} = <strong>{formatMoney(totalDamages)}</strong>
                      </div>
                    </div>
                    <div className="breakdown-step">
                      <strong>Step 2: Adjusted Case Value</strong>
                      <div className="breakdown-formula">
                        Total Damages × Liability Percentage
                      </div>
                      <div className="breakdown-calculation">
                        {formatMoney(totalDamages)} × {liabilityPercentage || 100}% = <strong>{formatMoney(adjustedValue)}</strong>
                      </div>
                    </div>
                    <div className="breakdown-step">
                      <strong>Step 3: Settlement Range</strong>
                      <div className="breakdown-formula">
                        Low End = Adjusted Value × 60%<br />
                        High End = Adjusted Value × 90% (capped by policy limits)
                      </div>
                      <div className="breakdown-calculation">
                        Low: {formatMoney(adjustedValue)} × 60% = <strong>{formatMoney(settlementRange.lowEnd)}</strong><br />
                        High: {formatMoney(adjustedValue)} × 90% = {formatMoney(adjustedValue * 0.9)}
                        {policyLimits && adjustedValue * 0.9 > parseFloat(policyLimits) && (
                          <> (capped at {formatMoney(policyLimits)})</>
                        )}
                        {' = '}<strong>{formatMoney(settlementRange.highEnd)}</strong>
                      </div>
                    </div>
                    {juryDamagesLikelihood && (
                      <div className="breakdown-step">
                        <strong>Step 4: Jury-Adjusted Range</strong>
                        <div className="breakdown-formula">
                          Settlement Range × Jury Likelihood Percentage
                        </div>
                        <div className="breakdown-calculation">
                          Low: {formatMoney(settlementRange.lowEnd)} × {juryDamagesLikelihood}% = <strong>{formatMoney(settlementRange.lowEnd * (parseFloat(juryDamagesLikelihood) / 100))}</strong><br />
                          High: {formatMoney(settlementRange.highEnd)} × {juryDamagesLikelihood}% = <strong>{formatMoney(settlementRange.highEnd * (parseFloat(juryDamagesLikelihood) / 100))}</strong>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {recommendedSettlement && (
                  <div className="recommended-settlement">
                    <strong>Recommended Settlement: {formatMoney(recommendedSettlement)}</strong>
                    <span className="recommended-confidence">High Confidence</span>
                  </div>
                )}
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

      {/* Scenario Comparison Modal */}
      {showScenarioComparison && (
        <ScenarioComparisonModal
          currentData={{
            medicalSpecials,
            economicDamages,
            nonEconomicDamages,
            policyLimits,
            liabilityPercentage,
            juryDamagesLikelihood
          }}
          scenarioData={scenarioData}
          setScenarioData={setScenarioData}
          currentScenario={currentScenario}
          onClose={() => setShowScenarioComparison(false)}
          onApply={() => {
            setMedicalSpecials(scenarioData.medicalSpecials);
            setEconomicDamages(scenarioData.economicDamages);
            setNonEconomicDamages(scenarioData.nonEconomicDamages);
            setPolicyLimits(scenarioData.policyLimits);
            setLiabilityPercentage(scenarioData.liabilityPercentage);
            setJuryDamagesLikelihood(scenarioData.juryDamagesLikelihood);
            setShowScenarioComparison(false);
          }}
          formatMoney={formatMoney}
          getJuryLikelihoodLabel={getJuryLikelihoodLabel}
        />
      )}
    </div>
  );
}

// Scenario Comparison Modal Component
function ScenarioComparisonModal({
  currentData,
  scenarioData,
  setScenarioData,
  currentScenario,
  onClose,
  onApply,
  formatMoney,
  getJuryLikelihoodLabel
}) {
  // Calculate comparison scenario based on current scenarioData
  // Use currentData as fallback if scenarioData hasn't been initialized
  const calculateComparisonScenario = useCallback((data) => {
    const medical = parseFloat(data.medicalSpecials) || 0;
    const economic = parseFloat(data.economicDamages) || 0;
    const nonEconomic = parseFloat(data.nonEconomicDamages) || 0;
    const total = medical + economic + nonEconomic;
    const liability = parseFloat(data.liabilityPercentage) || 100;
    const adjusted = total * (liability / 100);
    const policy = parseFloat(data.policyLimits) || Infinity;
    const baseLowEnd = Math.min(adjusted * 0.6, policy);
    const baseHighEnd = Math.min(adjusted * 0.9, policy);
    
    // In scenario comparison, if jury likelihood is provided, the settlement range should reflect the jury adjustment
    let settlementRange = { lowEnd: baseLowEnd, highEnd: baseHighEnd };
    let juryAdjusted = null;
    
    if (data.juryDamagesLikelihood) {
      const juryLikelihood = parseFloat(data.juryDamagesLikelihood) / 100;
      juryAdjusted = {
        lowEnd: baseLowEnd * juryLikelihood,
        highEnd: baseHighEnd * juryLikelihood
      };
      // Use jury-adjusted range as the settlement range in scenario comparison
      settlementRange = juryAdjusted;
    }
    
    const result = {
      totalDamages: total,
      adjustedValue: adjusted,
      settlementRange,
      juryAdjusted
    };
    
    return result;
  }, []);

  // Merge scenarioData with currentData - use scenarioData values when set, otherwise use currentData
  // Use useMemo to recalculate when scenarioData or currentData changes
  const effectiveScenarioData = useMemo(() => {
    // Check if scenarioData has been initialized (not all nulls/undefined)
    // If not initialized, use currentData directly
    const isInitialized = scenarioData.medicalSpecials !== null || 
                         scenarioData.liabilityPercentage !== null ||
                         scenarioData.juryDamagesLikelihood !== null ||
                         scenarioData.economicDamages !== null ||
                         scenarioData.nonEconomicDamages !== null ||
                         scenarioData.policyLimits !== null;
    
    // If not initialized, use currentData directly to avoid null -> 0 conversion
    if (!isInitialized && currentData) {
      return {
        medicalSpecials: currentData.medicalSpecials ?? null,
        economicDamages: currentData.economicDamages ?? null,
        nonEconomicDamages: currentData.nonEconomicDamages ?? null,
        policyLimits: currentData.policyLimits ?? null,
        liabilityPercentage: currentData.liabilityPercentage ?? null,
        juryDamagesLikelihood: currentData.juryDamagesLikelihood ?? null
      };
    }
    
    // Otherwise, merge: use scenarioData when it has a value, otherwise use currentData
    const merged = {
      medicalSpecials: (scenarioData.medicalSpecials !== null && scenarioData.medicalSpecials !== undefined) 
        ? scenarioData.medicalSpecials 
        : (currentData?.medicalSpecials ?? null),
      economicDamages: (scenarioData.economicDamages !== null && scenarioData.economicDamages !== undefined)
        ? scenarioData.economicDamages
        : (currentData?.economicDamages ?? null),
      nonEconomicDamages: (scenarioData.nonEconomicDamages !== null && scenarioData.nonEconomicDamages !== undefined)
        ? scenarioData.nonEconomicDamages
        : (currentData?.nonEconomicDamages ?? null),
      policyLimits: (scenarioData.policyLimits !== null && scenarioData.policyLimits !== undefined)
        ? scenarioData.policyLimits
        : (currentData?.policyLimits ?? null),
      liabilityPercentage: (scenarioData.liabilityPercentage !== null && scenarioData.liabilityPercentage !== undefined)
        ? scenarioData.liabilityPercentage
        : (currentData?.liabilityPercentage ?? null),
      juryDamagesLikelihood: (scenarioData.juryDamagesLikelihood !== null && scenarioData.juryDamagesLikelihood !== undefined)
        ? scenarioData.juryDamagesLikelihood
        : (currentData?.juryDamagesLikelihood ?? null)
    };
    
    return merged;
  }, [scenarioData, currentData]);
  
  const comparisonScenario = useMemo(() => {
    return calculateComparisonScenario(effectiveScenarioData);
  }, [effectiveScenarioData, calculateComparisonScenario]);

  const handleFieldChange = (field, value) => {
    setScenarioData(prev => ({ ...prev, [field]: value }));
  };

  const getDifference = (current, scenario) => {
    if (!current || !scenario) return null;
    const diff = scenario - current;
    const percent = current > 0 ? ((diff / current) * 100).toFixed(1) : 0;
    return { diff, percent, isPositive: diff > 0 };
  };

  const rangeDiff = getDifference(
    currentScenario.settlementRange.highEnd,
    comparisonScenario.settlementRange.highEnd
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content scenario-comparison-modal" onClick={(e) => e.stopPropagation()}>
        <h3>🔄 Compare Scenarios</h3>
        <p className="modal-subtitle">
          Adjust values below to see how different scenarios affect the settlement range
        </p>

        <div className="scenario-comparison">
          <div className="scenario-columns">
            {/* Current Scenario */}
            <div className="scenario-column current-scenario">
              <h4>Current</h4>
              <div className="scenario-results">
                <div className="result-item">
                  <label>Total Damages:</label>
                  <span>{formatMoney(currentScenario.totalDamages)}</span>
                </div>
                <div className="result-item">
                  <label>Adjusted Value:</label>
                  <span>{formatMoney(currentScenario.adjustedValue)}</span>
                </div>
                <div className="result-item highlight">
                  <label>Settlement Range:</label>
                  <span>
                    {formatMoney(currentScenario.settlementRange.lowEnd)} - {formatMoney(currentScenario.settlementRange.highEnd)}
                  </span>
                </div>
                {currentScenario.juryAdjusted && (
                  <div className="result-item">
                    <label>Jury-Adjusted Range:</label>
                    <span>
                      {formatMoney(currentScenario.juryAdjusted.lowEnd)} - {formatMoney(currentScenario.juryAdjusted.highEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Comparison Scenario */}
            <div className="scenario-column comparison-scenario">
              <h4>Scenario</h4>
              <div className="scenario-inputs">
                <div className="input-group">
                  <label>Liability %:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={effectiveScenarioData.liabilityPercentage || ''}
                    onChange={(e) => handleFieldChange('liabilityPercentage', e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>Jury Likelihood %:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={effectiveScenarioData.juryDamagesLikelihood || ''}
                    onChange={(e) => handleFieldChange('juryDamagesLikelihood', e.target.value)}
                  />
                </div>
              </div>
              <div className="scenario-results">
                <div className="result-item">
                  <label>Total Damages:</label>
                  <span>{formatMoney(comparisonScenario.totalDamages)}</span>
                </div>
                <div className="result-item">
                  <label>Adjusted Value:</label>
                  <span>{formatMoney(comparisonScenario.adjustedValue)}</span>
                </div>
                <div className="result-item highlight">
                  <label>Settlement Range:</label>
                  <span>
                    {formatMoney(comparisonScenario.settlementRange.lowEnd)} - {formatMoney(comparisonScenario.settlementRange.highEnd)}
                  </span>
                  {rangeDiff && Math.abs(rangeDiff.diff) > 0.01 && (
                    <span className={`range-diff ${rangeDiff.isPositive ? 'positive' : 'negative'}`}>
                      ({rangeDiff.isPositive ? '+' : ''}{formatMoney(rangeDiff.diff)}, {rangeDiff.isPositive ? '+' : ''}{rangeDiff.percent}%)
                    </span>
                  )}
                </div>
                {comparisonScenario.juryAdjusted && (
                  <div className="result-item">
                    <label>Jury-Adjusted Range:</label>
                    <span>
                      {formatMoney(comparisonScenario.juryAdjusted.lowEnd)} - {formatMoney(comparisonScenario.juryAdjusted.highEnd)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onApply}
          >
            Apply Scenario
          </button>
        </div>
      </div>
    </div>
  );
}

export default EvaluationPanel;
