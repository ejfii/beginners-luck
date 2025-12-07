import React, { useState } from 'react';
import axios from 'axios';
import '../styles/MoveTracker.css';
import { useMoneyInput } from '../hooks/useMoneyInput';
import { formatMoney } from '../utils/money';

function MoveTracker({ negotiation, onRefresh, token }) {
  const [moveAmount, setMoveAmount] = useState(null);
  const [newMove, setNewMove] = useState({
    party: 'plaintiff',
    type: 'demand',
    notes: ''
  });
  const [recommendation, setRecommendation] = useState(null);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [recommendationError, setRecommendationError] = useState(null);
  
  const amountInput = useMoneyInput(moveAmount, setMoveAmount);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  const handleAddMove = (e) => {
    e.preventDefault();
    
    if (!moveAmount || moveAmount < 0) {
      return;
    }
    
    const moveData = {
      negotiation_id: negotiation.id,
      ...newMove,
      amount: moveAmount
    };

    axios.post(`${API_BASE_URL}/moves`, moveData, getAxiosConfig())
      .then(() => {
        setNewMove({ party: 'plaintiff', type: 'demand', notes: '' });
        setMoveAmount(null);
        onRefresh();
      })
      .catch(err => console.error('Error adding move:', err));
  };

  const handleDeleteMove = (moveId, move) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this move?\n\n` +
      `Party: ${move.party === 'plaintiff' ? 'Plaintiff' : 'Defendant'}\n` +
      `Type: ${move.type === 'demand' ? 'Demand' : 'Offer'}\n` +
      `Amount: ${formatMoney(move.amount)}\n\n` +
      `This action cannot be undone.`
    );
    
    if (confirmed) {
      axios.delete(`${API_BASE_URL}/moves/${moveId}`, getAxiosConfig())
        .then(() => onRefresh())
        .catch(err => console.error('Error deleting move:', err));
    }
  };

  const handleGetRecommendation = () => {
    if (!negotiation.moves || negotiation.moves.length === 0) {
      setRecommendationError('Add at least one move to get a recommendation');
      return;
    }

    setLoadingRecommendation(true);
    setRecommendationError(null);
    setRecommendation(null);

    axios.post(`${API_BASE_URL}/negotiations/${negotiation.id}/recommend`, {}, getAxiosConfig())
      .then(res => {
        setRecommendation(res.data);
      })
      .catch(err => {
        console.error('Error getting recommendation:', err);
        setRecommendationError(err.response?.data?.error || 'Failed to get recommendation');
      })
      .finally(() => {
        setLoadingRecommendation(false);
      });
  };

  return (
    <div className="move-tracker">
      <h3>Demand & Offer Tracker</h3>

      <form onSubmit={handleAddMove} className="move-form" aria-label="Add negotiation move">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="move-party">Party</label>
            <select
              id="move-party"
              value={newMove.party}
              onChange={(e) => setNewMove({ ...newMove, party: e.target.value })}
              aria-label="Select party making the move"
            >
              <option value="plaintiff">Plaintiff</option>
              <option value="defendant">Defendant</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="move-type">Type</label>
            <select
              id="move-type"
              value={newMove.type}
              onChange={(e) => setNewMove({ ...newMove, type: e.target.value })}
              aria-label="Select move type"
            >
              <option value="demand">Demand</option>
              <option value="offer">Offer</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="move-amount">Amount ($)</label>
            <input
              id="move-amount"
              type="text"
              value={amountInput.displayValue}
              onChange={amountInput.onChange}
              onBlur={amountInput.onBlur}
              required
              placeholder="e.g., 2M, 750k"
              aria-label="Enter move amount in dollars"
            />
            {amountInput.error && <span className="input-error">{amountInput.error}</span>}
            <small className="input-hint">Supports shorthand: 50k, 2M, etc.</small>
          </div>
        </div>

        <div className="form-group full-width">
          <label htmlFor="move-notes">Notes</label>
          <input
            id="move-notes"
            type="text"
            value={newMove.notes}
            onChange={(e) => setNewMove({ ...newMove, notes: e.target.value })}
            aria-label="Optional notes about this move"
            placeholder="Optional notes..."
          />
        </div>

        <button type="submit" className="btn btn-primary">Add Move</button>
      </form>

      {negotiation.moves && negotiation.moves.length > 0 && 
       negotiation.moves[negotiation.moves.length - 1].party === 'defendant' && (
        <button 
          onClick={handleGetRecommendation}
          disabled={loadingRecommendation}
          className="btn btn-recommendation"
        >
          {loadingRecommendation ? 'Getting Recommendation...' : '💡 Get Recommendation'}
        </button>
      )}

      {recommendationError && (
        <div className="recommendation-error">
          {recommendationError}
        </div>
      )}

      {recommendation && (
        <div className="recommendation-box">
          <div className="recommendation-header">
            <h4>Recommended Move</h4>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div className="confidence-badge">
                Confidence: {Math.round(recommendation.confidence * 100)}%
              </div>
              <button 
                onClick={() => setRecommendation(null)}
                className="btn-close-recommendation"
                title="Close recommendation"
              >
                ✕
              </button>
            </div>
          </div>
          <div className="recommendation-content">
            <div className="recommendation-suggestion">
              <span className="party-label">{recommendation.party}</span>
              <span className="type-label">{recommendation.type}</span>
              <span className="amount-label">
                ${parseFloat(recommendation.suggestedAmount).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </span>
            </div>
            <div className="recommendation-reasoning">
              <p>{recommendation.reasoning}</p>
            </div>
          </div>
        </div>
      )}

      {negotiation.moves && negotiation.moves.length > 0 ? (
        <div className="moves-timeline">
          <h4>Timeline</h4>
          <ul>
            {negotiation.moves.map(move => (
              <li key={move.id} className={`move-item move-${move.type}`}>
                <div className="move-content">
                  <span className="move-party">{move.party}</span>
                  <span className={`move-type move-${move.type}`}>{move.type}</span>
                  <span className="move-amount">${parseFloat(move.amount).toLocaleString()}</span>
                </div>
                <div className="move-meta">
                  <small>{new Date(move.timestamp).toLocaleString()}</small>
                  {move.notes && <small> • {move.notes}</small>}
                </div>
                <button
                  className="btn-delete"
                  onClick={() => handleDeleteMove(move.id, move)}
                  title="Delete this move"
                  aria-label={`Delete ${move.party} ${move.type} of ${move.amount}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="empty-message">No moves recorded yet</p>
      )}
    </div>
  );
}

export default MoveTracker;
