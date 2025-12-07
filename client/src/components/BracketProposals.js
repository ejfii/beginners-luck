import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/BracketProposals.css';
import { useMoneyInput } from '../hooks/useMoneyInput';
import { formatMoney } from '../utils/money';

function BracketProposals({ negotiationId, token }) {
  const [brackets, setBrackets] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plaintiffAmount, setPlaintiffAmount] = useState(null);
  const [defendantAmount, setDefendantAmount] = useState(null);
  const [notes, setNotes] = useState('');
  const [proposedBy, setProposedBy] = useState('plaintiff'); // Default to plaintiff
  const [suggestionReasoning, setSuggestionReasoning] = useState('');
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  
  // Money input handlers
  const plaintiffInput = useMoneyInput(plaintiffAmount, setPlaintiffAmount);
  const defendantInput = useMoneyInput(defendantAmount, setDefendantAmount);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchBrackets();
  }, [negotiationId]);

  // Set default proposer based on last bracket
  useEffect(() => {
    if (brackets.length > 0 && !showForm) {
      const lastBracket = brackets[0]; // Most recent bracket (DESC order)
      // Suggest alternating: if last was plaintiff, suggest defendant, and vice versa
      const suggestedProposer = lastBracket.proposed_by === 'plaintiff' ? 'defendant' : 'plaintiff';
      setProposedBy(suggestedProposer);
    }
  }, [brackets, showForm]);

  const fetchBrackets = () => {
    setLoading(true);
    setError(null);
    axios.get(`${API_BASE_URL}/negotiations/${negotiationId}/brackets`, getAxiosConfig())
      .then(res => {
        setBrackets(res.data);
      })
      .catch(err => {
        console.error('Error fetching brackets:', err);
        setError(err.response?.data?.error || 'Failed to fetch brackets');
      })
      .finally(() => setLoading(false));
  };

  const handleGetSuggestion = () => {
    setLoadingSuggestion(true);
    setError(null);
    setSuggestionReasoning('');
    
    axios.post(`${API_BASE_URL}/negotiations/${negotiationId}/brackets/suggest`, {}, getAxiosConfig())
      .then(res => {
        const { plaintiff_amount, defendant_amount, reasoning } = res.data;
        setPlaintiffAmount(plaintiff_amount);
        setDefendantAmount(defendant_amount);
        setSuggestionReasoning(reasoning);
        setShowForm(true);
      })
      .catch(err => {
        console.error('Error getting bracket suggestion:', err);
        setError(err.response?.data?.error || 'Failed to get bracket suggestion');
      })
      .finally(() => setLoadingSuggestion(false));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!plaintiffAmount || plaintiffAmount < 0) {
      setError('Plaintiff amount must be a valid positive number');
      return;
    }

    if (!defendantAmount || defendantAmount < 0) {
      setError('Defendant amount must be a valid positive number');
      return;
    }

    if (plaintiffInput.error || defendantInput.error) {
      setError('Please fix input errors before submitting');
      return;
    }

    const bracketData = {
      plaintiff_amount: plaintiffAmount,
      defendant_amount: defendantAmount,
      notes: notes,
      proposed_by: proposedBy
    };

    setLoading(true);
    axios.post(`${API_BASE_URL}/negotiations/${negotiationId}/brackets`, bracketData, getAxiosConfig())
      .then(res => {
        setBrackets([res.data, ...brackets]);
        setPlaintiffAmount(null);
        setDefendantAmount(null);
        setNotes('');
        setSuggestionReasoning('');
        setShowForm(false);
      })
      .catch(err => {
        console.error('Error creating bracket:', err);
        setError(err.response?.data?.details?.[0] || err.response?.data?.error || 'Failed to create bracket');
      })
      .finally(() => setLoading(false));
  };

  const handleStatusChange = (bracketId, newStatus) => {
    axios.put(`${API_BASE_URL}/brackets/${bracketId}`, { status: newStatus, notes: '' }, getAxiosConfig())
      .then(() => {
        fetchBrackets();
      })
      .catch(err => {
        console.error('Error updating bracket:', err);
        setError(err.response?.data?.error || 'Failed to update bracket');
      });
  };

  const formatCurrency = formatMoney;

  return (
    <div className="bracket-proposals">
      <div className="bracket-header">
        <h3>Alternative Bracket Proposals</h3>
        <div className="bracket-header-buttons">
          <button 
            className="btn btn-suggestion" 
            onClick={handleGetSuggestion}
            disabled={loading || loadingSuggestion}
            title="Get an AI-suggested bracket based on your negotiation data"
          >
            {loadingSuggestion ? '⏳ Getting Suggestion...' : '💡 Bracket Suggestion'}
          </button>
          <button 
            className="btn btn-primary" 
            onClick={() => {
              setShowForm(!showForm);
              setSuggestionReasoning('');
            }}
            disabled={loading}
          >
            {showForm ? 'Cancel' : '➕ New Bracket'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <form className="bracket-form" onSubmit={handleSubmit}>
          <p className="bracket-explanation">
            Propose a bracket settlement: &quot;Plaintiff will be at <strong>[P amount]</strong> if Defendant is at <strong>[D amount]</strong>&quot;
          </p>
          
          {suggestionReasoning && (
            <div className="suggestion-reasoning">
              <strong>💡 Suggestion Reasoning:</strong>
              <p>{suggestionReasoning}</p>
            </div>
          )}
          
          <div className="form-section">
            <h4>Bracket Proposal</h4>
            
            <div className="form-group">
              <label>Proposed By:</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="proposed_by"
                    value="plaintiff"
                    checked={proposedBy === 'plaintiff'}
                    onChange={(e) => setProposedBy(e.target.value)}
                  />
                  <span>Plaintiff</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="proposed_by"
                    value="defendant"
                    checked={proposedBy === 'defendant'}
                    onChange={(e) => setProposedBy(e.target.value)}
                  />
                  <span>Defendant</span>
                </label>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="plaintiff-amount">Plaintiff Amount ($)</label>
                <input
                  id="plaintiff-amount"
                  type="text"
                  value={plaintiffInput.displayValue}
                  onChange={plaintiffInput.onChange}
                  onBlur={plaintiffInput.onBlur}
                  required
                  placeholder="e.g., 2M, 2000000, or $2,000,000"
                  aria-label="Plaintiff bracket settlement amount"
                />
                {plaintiffInput.error && <span className="input-error">{plaintiffInput.error}</span>}
                <small className="input-hint">Supports shorthand: 50k, 2M, etc.</small>
              </div>
              <div className="form-group">
                <label htmlFor="defendant-amount">Defendant Amount ($)</label>
                <input
                  id="defendant-amount"
                  type="text"
                  value={defendantInput.displayValue}
                  onChange={defendantInput.onChange}
                  onBlur={defendantInput.onBlur}
                  required
                  placeholder="e.g., 750k, 750000, or $750,000"
                  aria-label="Defendant bracket settlement amount"
                />
                {defendantInput.error && <span className="input-error">{defendantInput.error}</span>}
                <small className="input-hint">Supports shorthand: 50k, 2M, etc.</small>
              </div>
            </div>
          </div>

          <div className="form-group full-width">
            <label htmlFor="bracket-notes">Notes</label>
            <textarea
              id="bracket-notes"
              aria-label="Optional notes about this bracket proposal"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this bracket proposal..."
              rows="3"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Bracket'}
          </button>
        </form>
      )}

      {loading && brackets.length === 0 ? (
        <p className="loading-message">Loading brackets...</p>
      ) : brackets.length === 0 ? (
        <p className="empty-message">No bracket proposals yet. Use &quot;Bracket Suggestion&quot; or &quot;New Bracket&quot; to create one.</p>
      ) : (
        <div className="brackets-list">
          {brackets.map(bracket => (
            <div key={bracket.id} className={`bracket-item bracket-${bracket.status} bracket-proposed-by-${bracket.proposed_by || 'plaintiff'}`}>
              <div className="bracket-content">
                <div className="bracket-header-info">
                  <span className={`proposer-badge proposer-${bracket.proposed_by || 'plaintiff'}`}>
                    {bracket.proposed_by === 'defendant' ? '🛡️ Defendant Bracket' : '⚖️ Plaintiff Bracket'}
                  </span>
                  <span className="date-label">{new Date(bracket.created_at).toLocaleDateString()}</span>
                </div>
                <div className="bracket-proposal">
                  <p className="bracket-statement">
                    Plaintiff will be at <strong className="plaintiff-amount">{formatCurrency(bracket.plaintiff_amount)}</strong>
                    {' '}if Defendant is at <strong className="defendant-amount">{formatCurrency(bracket.defendant_amount)}</strong>
                  </p>
                </div>
                {bracket.notes && (
                  <div className="bracket-notes">
                    <p>{bracket.notes}</p>
                  </div>
                )}
                <div className="bracket-meta">
                  <span className={`status-badge status-${bracket.status}`}>{bracket.status}</span>
                </div>
              </div>
              {bracket.status === 'active' && (
                <div className="bracket-actions">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleStatusChange(bracket.id, 'accepted')}
                  >
                    Accept
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleStatusChange(bracket.id, 'rejected')}
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BracketProposals;
