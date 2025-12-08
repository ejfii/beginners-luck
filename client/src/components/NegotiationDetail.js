import React, { useState, useEffect } from 'react';
import MoveTracker from './MoveTracker';
import AnalyticsDashboard from './AnalyticsDashboard';
import PdfExport from './PdfExport';
import Toast from './Toast';
import BracketProposals from './BracketProposals';
import MediatorProposal from './MediatorProposal';
import EvaluationPanel from './EvaluationPanel';
import InsurerHistory from './InsurerHistory';
import '../styles/NegotiationDetail.css';

function NegotiationDetail({ negotiation, onUpdate, onDelete, onRefresh, onOpenMediationView, token }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState(negotiation);

  useEffect(() => {
    setEditData(negotiation);
  }, [negotiation]);

  const handleStatusChange = (newStatus) => {
    // Only send the status field to avoid sending non-column data (moves/analytics)
    onUpdate(negotiation.id, { status: newStatus });
    setEditData({ ...editData, status: newStatus });
  };

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'info' });
  const [showTemplateSaveModal, setShowTemplateSaveModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const handleSaveAsTemplate = () => {
    setTemplateName(`Template: ${negotiation.name}`);
    setTemplateDescription('');
    setShowTemplateSaveModal(true);
  };

  const handleConfirmSaveTemplate = async (e) => {
    e.preventDefault();
    
    if (!templateName.trim()) {
      setToast({ visible: true, message: 'Template name is required', type: 'error' });
      return;
    }

    // Prepare template data - include key fields but exclude case-specific info
    const templateData = {
      plaintiff_attorney: negotiation.plaintiff_attorney,
      defendant_attorney: negotiation.defendant_attorney,
      mediator: negotiation.mediator,
      venue: negotiation.venue,
      judge: negotiation.judge,
      coverage: negotiation.coverage,
      primary_coverage_limit: negotiation.primary_coverage_limit,
      primary_insurer_name: negotiation.primary_insurer_name,
      primary_adjuster_name: negotiation.primary_adjuster_name,
      umbrella_coverage_limit: negotiation.umbrella_coverage_limit,
      umbrella_insurer_name: negotiation.umbrella_insurer_name,
      umbrella_adjuster_name: negotiation.umbrella_adjuster_name,
      uim_coverage_limit: negotiation.uim_coverage_limit,
      uim_insurer_name: negotiation.uim_insurer_name,
      uim_adjuster_name: negotiation.uim_adjuster_name,
      defendant_type: negotiation.defendant_type,
      // Include parties if available
      parties: negotiation.parties || []
    };

    try {
      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: templateName.trim(),
          description: templateDescription.trim() || null,
          template_data: templateData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save template');
      }

      setShowTemplateSaveModal(false);
      setTemplateName('');
      setTemplateDescription('');
      setToast({ visible: true, message: 'Template saved successfully!', type: 'success' });
    } catch (error) {
      console.error('Error saving template:', error);
      setToast({ visible: true, message: 'Failed to save template', type: 'error' });
    }
  };

  const handleSaveEdit = () => {
    setIsSaving(true);
    setToast({ visible: false, message: '', type: 'info' });
    // onUpdate returns a promise (App.js updated)
    // Only include fields that exist on the `negotiations` table
    const updates = {
      plaintiff_attorney: editData.plaintiff_attorney,
      defendant_attorney: editData.defendant_attorney,
      mediator: editData.mediator,
      judge: editData.judge,
      venue: editData.venue,
      coverage: editData.coverage,
      primary_coverage_limit: editData.primary_coverage_limit,
      primary_insurer_name: editData.primary_insurer_name,
      primary_adjuster_name: editData.primary_adjuster_name,
      umbrella_coverage_limit: editData.umbrella_coverage_limit,
      umbrella_insurer_name: editData.umbrella_insurer_name,
      umbrella_adjuster_name: editData.umbrella_adjuster_name,
      uim_coverage_limit: editData.uim_coverage_limit,
      uim_insurer_name: editData.uim_insurer_name,
      uim_adjuster_name: editData.uim_adjuster_name,
      defendant_type: editData.defendant_type,
      injury_description: editData.injury_description,
      past_medical_bills: editData.past_medical_bills,
      future_medical_bills: editData.future_medical_bills,
      lcp: editData.lcp,
      lost_wages: editData.lost_wages,
      loss_earning_capacity: editData.loss_earning_capacity,
      settlement_goal: editData.settlement_goal,
      notes: editData.notes,
      status: editData.status
    };

    onUpdate(negotiation.id, updates)
      .then(() => {
        setIsEditing(false);
        setToast({ visible: true, message: 'Saved successfully', type: 'success' });
      })
      .catch(() => {
        setToast({ visible: true, message: 'Error saving changes', type: 'error' });
      })
      .finally(() => setIsSaving(false));
  };

  const totalDamages = (negotiation.past_medical_bills || 0) +
                       (negotiation.future_medical_bills || 0) +
                       (negotiation.lcp || 0) +
                       (negotiation.lost_wages || 0) +
                       (negotiation.loss_earning_capacity || 0);

  return (
    <div className="negotiation-detail">
      <div className="detail-header">
        <div>
          <h2>{negotiation.name}</h2>
          <p className={`status status-${negotiation.status}`}>Status: {negotiation.status}</p>
        </div>
        <div className="detail-actions">
          <button
            className="btn btn-primary"
            onClick={onOpenMediationView}
            title="Open focused mediation view"
          >
            📋 Mediation View
          </button>
          <button
            className={`btn ${negotiation.status === 'settled' ? 'btn-secondary' : 'btn-success'}`}
            onClick={() => handleStatusChange(negotiation.status === 'settled' ? 'active' : 'settled')}
          >
            {negotiation.status === 'settled' ? 'Reopen Case' : 'Mark Settled'}
          </button>
          <PdfExport negotiation={negotiation} />
          <button className="btn btn-secondary" onClick={handleSaveAsTemplate} title="Save as template for reuse">
            💾 Save as Template
          </button>
          <button className="btn btn-secondary" onClick={() => setIsEditing(!isEditing)}>
            {isEditing ? 'Cancel Edit' : 'Edit Details'}
          </button>
          <button
            className="btn btn-danger"
            onClick={() => onDelete(negotiation.id, negotiation.name)}
            title="Soft delete this negotiation"
          >
            Close Case
          </button>
        </div>
      </div>

      <div className="detail-grid">
        <div className="case-information">
          <h3>Case Information</h3>
          {isEditing ? (
            <div className="edit-form">
              <h4>Parties</h4>
              <div className="form-group">
                <label htmlFor="plaintiff_attorney">Plaintiff Attorney (Legacy)</label>
                <input
                  id="plaintiff_attorney"
                  value={editData.plaintiff_attorney || ''}
                  onChange={(e) => setEditData({ ...editData, plaintiff_attorney: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="defendant_attorney">Defendant Attorney (Legacy)</label>
                <input
                  id="defendant_attorney"
                  value={editData.defendant_attorney || ''}
                  onChange={(e) => setEditData({ ...editData, defendant_attorney: e.target.value })}
                />
              </div>
              <p className="edit-note"><em>Note: To manage multiple plaintiffs/defendants, use the API or create a new negotiation.</em></p>
              
              <h4>Case Details</h4>
              <div className="form-group">
                <label htmlFor="mediator">Mediator</label>
                <input
                  id="mediator"
                  value={editData.mediator || ''}
                  onChange={(e) => setEditData({ ...editData, mediator: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="judge">Judge</label>
                <input
                  id="judge"
                  value={editData.judge || ''}
                  onChange={(e) => setEditData({ ...editData, judge: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="venue">Venue</label>
                <input
                  id="venue"
                  value={editData.venue || ''}
                  onChange={(e) => setEditData({ ...editData, venue: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label htmlFor="defendant_type">Defendant Type</label>
                <select
                  id="defendant_type"
                  value={editData.defendant_type || ''}
                  onChange={(e) => setEditData({ ...editData, defendant_type: e.target.value })}
                >
                  <option value="">Select...</option>
                  <option value="Individual">Individual</option>
                  <option value="Corporation">Corporation</option>
                  <option value="Government">Government</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="coverage">Coverage (Legacy)</label>
                <input
                  id="coverage"
                  value={editData.coverage || ''}
                  onChange={(e) => setEditData({ ...editData, coverage: e.target.value })}
                  placeholder="General coverage description"
                />
              </div>
              
              <h4>Insurance Coverage</h4>
              <fieldset className="edit-fieldset">
                <legend>Primary Insurance</legend>
                <div className="form-group">
                  <label htmlFor="primary_coverage_limit">Primary Coverage Limit ($)</label>
                  <input
                    id="primary_coverage_limit"
                    type="number"
                    value={editData.primary_coverage_limit || ''}
                    onChange={(e) => setEditData({ ...editData, primary_coverage_limit: parseFloat(e.target.value) || null })}
                    min="0"
                    step="10000"
                    placeholder="e.g., 250000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="primary_insurer_name">Primary Insurer Name</label>
                  <input
                    id="primary_insurer_name"
                    value={editData.primary_insurer_name || ''}
                    onChange={(e) => setEditData({ ...editData, primary_insurer_name: e.target.value })}
                    placeholder="e.g., State Farm"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="primary_adjuster_name">Primary Adjuster</label>
                  <input
                    id="primary_adjuster_name"
                    value={editData.primary_adjuster_name || ''}
                    onChange={(e) => setEditData({ ...editData, primary_adjuster_name: e.target.value })}
                    placeholder="e.g., John Smith"
                  />
                </div>
              </fieldset>
              
              <fieldset className="edit-fieldset">
                <legend>Umbrella / Excess Coverage</legend>
                <div className="form-group">
                  <label htmlFor="umbrella_coverage_limit">Umbrella Coverage Limit ($)</label>
                  <input
                    id="umbrella_coverage_limit"
                    type="number"
                    value={editData.umbrella_coverage_limit || ''}
                    onChange={(e) => setEditData({ ...editData, umbrella_coverage_limit: parseFloat(e.target.value) || null })}
                    min="0"
                    step="10000"
                    placeholder="e.g., 1000000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="umbrella_insurer_name">Umbrella Insurer Name</label>
                  <input
                    id="umbrella_insurer_name"
                    value={editData.umbrella_insurer_name || ''}
                    onChange={(e) => setEditData({ ...editData, umbrella_insurer_name: e.target.value })}
                    placeholder="e.g., Liberty Mutual"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="umbrella_adjuster_name">Umbrella Adjuster</label>
                  <input
                    id="umbrella_adjuster_name"
                    value={editData.umbrella_adjuster_name || ''}
                    onChange={(e) => setEditData({ ...editData, umbrella_adjuster_name: e.target.value })}
                    placeholder="e.g., Jane Doe"
                  />
                </div>
              </fieldset>
              
              <fieldset className="edit-fieldset">
                <legend>UM/UIM Coverage</legend>
                <div className="form-group">
                  <label htmlFor="uim_coverage_limit">UM/UIM Coverage Limit ($)</label>
                  <input
                    id="uim_coverage_limit"
                    type="number"
                    value={editData.uim_coverage_limit || ''}
                    onChange={(e) => setEditData({ ...editData, uim_coverage_limit: parseFloat(e.target.value) || null })}
                    min="0"
                    step="10000"
                    placeholder="e.g., 100000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="uim_insurer_name">UM/UIM Insurer Name</label>
                  <input
                    id="uim_insurer_name"
                    value={editData.uim_insurer_name || ''}
                    onChange={(e) => setEditData({ ...editData, uim_insurer_name: e.target.value })}
                    placeholder="e.g., Plaintiff's Carrier"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="uim_adjuster_name">UM/UIM Adjuster</label>
                  <input
                    id="uim_adjuster_name"
                    value={editData.uim_adjuster_name || ''}
                    onChange={(e) => setEditData({ ...editData, uim_adjuster_name: e.target.value })}
                    placeholder="e.g., Bob Johnson"
                  />
                </div>
              </fieldset>
              
              <h4>Damages</h4>
              <div className="form-group">
                <label htmlFor="past_medical_bills">Past Medical Bills ($)</label>
                <input
                  id="past_medical_bills"
                  type="number"
                  value={editData.past_medical_bills || 0}
                  onChange={(e) => setEditData({ ...editData, past_medical_bills: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label htmlFor="future_medical_bills">Future Medical Bills ($)</label>
                <input
                  id="future_medical_bills"
                  type="number"
                  value={editData.future_medical_bills || 0}
                  onChange={(e) => setEditData({ ...editData, future_medical_bills: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lcp">Life Care Plan ($)</label>
                <input
                  id="lcp"
                  type="number"
                  value={editData.lcp || 0}
                  onChange={(e) => setEditData({ ...editData, lcp: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label htmlFor="lost_wages">Lost Wages ($)</label>
                <input
                  id="lost_wages"
                  type="number"
                  value={editData.lost_wages || 0}
                  onChange={(e) => setEditData({ ...editData, lost_wages: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              <div className="form-group">
                <label htmlFor="loss_earning_capacity">Loss Earning Capacity ($)</label>
                <input
                  id="loss_earning_capacity"
                  type="number"
                  value={editData.loss_earning_capacity || 0}
                  onChange={(e) => setEditData({ ...editData, loss_earning_capacity: parseFloat(e.target.value) || 0 })}
                  min="0"
                  step="100"
                />
              </div>
              
              <div className="form-group full-width">
                <label htmlFor="injury_description">Injury Description</label>
                <textarea
                  id="injury_description"
                  value={editData.injury_description || ''}
                  onChange={(e) => setEditData({ ...editData, injury_description: e.target.value })}
                  rows="4"
                  placeholder="Describe the injuries sustained"
                />
              </div>
              
              <button
                className="btn btn-primary"
                onClick={handleSaveEdit}
                disabled={isSaving}
                aria-busy={isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="spinner" aria-hidden="true" />
                    &nbsp;Saving...
                  </>
                ) : (
                  'Save All Changes'
                )}
              </button>
            </div>
          ) : (
            <>
              <h4 className="parties-heading">Parties</h4>
              {negotiation.parties && negotiation.parties.length > 0 ? (
                <div className="parties-list">
                  <div className="parties-section">
                    <h5>Plaintiffs</h5>
                    {negotiation.parties.filter(p => p.role === 'plaintiff').length > 0 ? (
                      negotiation.parties.filter(p => p.role === 'plaintiff').map(party => (
                        <div key={party.id} className="party-card">
                          <div><strong>{party.party_name}</strong></div>
                          {party.attorney_name && <div>Attorney: {party.attorney_name}</div>}
                          {party.law_firm_name && <div>Law Firm: {party.law_firm_name}</div>}
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No plaintiffs</p>
                    )}
                  </div>
                  <div className="parties-section">
                    <h5>Defendants</h5>
                    {negotiation.parties.filter(p => p.role === 'defendant').length > 0 ? (
                      negotiation.parties.filter(p => p.role === 'defendant').map(party => (
                        <div key={party.id} className="party-card">
                          <div><strong>{party.party_name}</strong></div>
                          {party.attorney_name && <div>Attorney: {party.attorney_name}</div>}
                          {party.law_firm_name && <div>Law Firm: {party.law_firm_name}</div>}
                        </div>
                      ))
                    ) : (
                      <p className="no-data">No defendants</p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="legacy-attorneys">
                  <dl>
                    <dt>Plaintiff Attorney (Legacy)</dt>
                    <dd>{negotiation.plaintiff_attorney || 'N/A'}</dd>
                    <dt>Defendant Attorney (Legacy)</dt>
                    <dd>{negotiation.defendant_attorney || 'N/A'}</dd>
                  </dl>
                </div>
              )}

              <h4>Case Details</h4>
              <dl>
                <dt>Mediator</dt>
                <dd>{negotiation.mediator || 'N/A'}</dd>
                <dt>Judge</dt>
                <dd>{negotiation.judge || 'N/A'}</dd>
                <dt>Venue</dt>
                <dd>{negotiation.venue || 'N/A'}</dd>
                <dt>Defendant Type</dt>
                <dd>{negotiation.defendant_type || 'N/A'}</dd>
                {negotiation.coverage && (
                  <>
                    <dt>Coverage (Legacy)</dt>
                    <dd>{negotiation.coverage}</dd>
                  </>
                )}
              </dl>

              <h4 className="insurance-heading">Insurance Coverage</h4>
            
            {(negotiation.primary_coverage_limit || negotiation.primary_insurer_name || negotiation.primary_adjuster_name) && (
              <div className="insurance-layer">
                <h5>Primary Insurance</h5>
                <dl>
                  {negotiation.primary_coverage_limit && (
                    <>
                      <dt>Coverage Limit</dt>
                      <dd>${negotiation.primary_coverage_limit.toLocaleString()}</dd>
                    </>
                  )}
                  {negotiation.primary_insurer_name && (
                    <>
                      <dt>Insurance Company</dt>
                      <dd>{negotiation.primary_insurer_name}</dd>
                    </>
                  )}
                  {negotiation.primary_adjuster_name && (
                    <>
                      <dt>Adjuster</dt>
                      <dd>{negotiation.primary_adjuster_name}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {(negotiation.umbrella_coverage_limit || negotiation.umbrella_insurer_name || negotiation.umbrella_adjuster_name) && (
              <div className="insurance-layer">
                <h5>Umbrella / Excess Coverage</h5>
                <dl>
                  {negotiation.umbrella_coverage_limit && (
                    <>
                      <dt>Coverage Limit</dt>
                      <dd>${negotiation.umbrella_coverage_limit.toLocaleString()}</dd>
                    </>
                  )}
                  {negotiation.umbrella_insurer_name && (
                    <>
                      <dt>Insurance Company</dt>
                      <dd>{negotiation.umbrella_insurer_name}</dd>
                    </>
                  )}
                  {negotiation.umbrella_adjuster_name && (
                    <>
                      <dt>Adjuster</dt>
                      <dd>{negotiation.umbrella_adjuster_name}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {(negotiation.uim_coverage_limit || negotiation.uim_insurer_name || negotiation.uim_adjuster_name) && (
              <div className="insurance-layer">
                <h5>UM/UIM Coverage</h5>
                <dl>
                  {negotiation.uim_coverage_limit && (
                    <>
                      <dt>Coverage Limit</dt>
                      <dd>${negotiation.uim_coverage_limit.toLocaleString()}</dd>
                    </>
                  )}
                  {negotiation.uim_insurer_name && (
                    <>
                      <dt>Insurance Company</dt>
                      <dd>{negotiation.uim_insurer_name}</dd>
                    </>
                  )}
                  {negotiation.uim_adjuster_name && (
                    <>
                      <dt>Adjuster</dt>
                      <dd>{negotiation.uim_adjuster_name}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}

            {!negotiation.primary_coverage_limit && !negotiation.umbrella_coverage_limit && !negotiation.uim_coverage_limit && (
              <p className="no-insurance-data">No insurance coverage information entered</p>
            )}
            </>
          )}
        </div>

        <div className="damages-information">
          <h3>Damages Breakdown</h3>
          <dl>
            <dt>Past Medical Bills</dt>
            <dd>${(negotiation.past_medical_bills || 0).toLocaleString()}</dd>
            <dt>Future Medical Bills</dt>
            <dd>${(negotiation.future_medical_bills || 0).toLocaleString()}</dd>
            <dt>Lost Wages</dt>
            <dd>${(negotiation.lost_wages || 0).toLocaleString()}</dd>
            <dt>Loss of Earning Capacity</dt>
            <dd>${(negotiation.lcp || 0).toLocaleString()}</dd>
            <dt>Loss Earning Capacity</dt>
            <dd>${(negotiation.loss_earning_capacity || 0).toLocaleString()}</dd>
            <dt className="total"><strong>Total Damages</strong></dt>
            <dd className="total"><strong>${totalDamages.toLocaleString()}</strong></dd>
          </dl>
        </div>
      </div>

      {negotiation.injury_description && (
        <div className="injury-description">
          <h3>Injury Description</h3>
          <p>{negotiation.injury_description}</p>
        </div>
      )}

      <div className="settlement-goal-section">
        <h3>Settlement Strategy</h3>
        {isEditing ? (
          <div className="form-group">
            <label>Settlement Goal ($)</label>
            <input
              type="number"
              value={editData.settlement_goal || 0}
              onChange={(e) => setEditData({ ...editData, settlement_goal: parseFloat(e.target.value) || 0 })}
              min="0"
              step="1000"
              placeholder="Optional target settlement amount"
            />
          </div>
        ) : (
          <div className="strategy-display">
            {negotiation.settlement_goal ? (
              <p><strong>Settlement Goal:</strong> ${negotiation.settlement_goal.toLocaleString()}</p>
            ) : (
              <p className="no-goal">No settlement goal set</p>
            )}
          </div>
        )}
      </div>

      <div className="notes-section">
        <h3>Case Notes</h3>
        {isEditing ? (
          <textarea
            value={editData.notes || ''}
            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
            rows="4"
            placeholder="Add or edit case notes"
            className="notes-textarea"
          />
        ) : (
          <div className="notes-display">
            {negotiation.notes ? (
              <p>{negotiation.notes}</p>
            ) : (
              <p className="no-notes">No notes added</p>
            )}
          </div>
        )}
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast({ ...toast, visible: false })}
      />

      <EvaluationPanel 
        negotiation={negotiation} 
        token={token} 
        onUpdate={() => {
          onRefresh();
        }}
      />

      <InsurerHistory 
        negotiation={negotiation} 
        token={token} 
      />

      <MoveTracker negotiation={negotiation} onRefresh={onRefresh} token={token} />

      <BracketProposals negotiationId={negotiation.id} token={token} />

      <MediatorProposal negotiationId={negotiation.id} token={token} />

      <AnalyticsDashboard analytics={negotiation.analytics} moves={negotiation.moves} negotiation={negotiation} />

      {/* Save as Template Modal */}
      {showTemplateSaveModal && (
        <div className="modal-overlay" onClick={() => setShowTemplateSaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Save as Template</h3>
            <p className="modal-subtitle">
              Create a reusable template from this case&apos;s configuration. The template will include parties, coverage details, and case type.
            </p>
            
            <form onSubmit={handleConfirmSaveTemplate}>
              <div className="form-group">
                <label htmlFor="templateName">Template Name *</label>
                <input
                  id="templateName"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g., Auto Accident - State Farm"
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="templateDescription">Description (Optional)</label>
                <textarea
                  id="templateDescription"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Brief description of when to use this template..."
                  rows="3"
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTemplateSaveModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default NegotiationDetail;
