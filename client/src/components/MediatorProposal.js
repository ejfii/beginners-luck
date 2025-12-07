import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/MediatorProposal.css';
import { useMoneyInput } from '../hooks/useMoneyInput';
import { formatMoney } from '../utils/money';

function MediatorProposal({ negotiationId, token }) {
  const [proposal, setProposal] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');
  const [proposalAmount, setProposalAmount] = useState(null);
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  
  const amountInput = useMoneyInput(proposalAmount, setProposalAmount);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchProposal();
  }, [negotiationId]);

  useEffect(() => {
    if (proposal && proposal.status === 'pending') {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [proposal]);

  const fetchProposal = () => {
    setLoading(true);
    setError(null);
    axios.get(`${API_BASE_URL}/negotiations/${negotiationId}/mediator-proposal`, getAxiosConfig())
      .then(res => {
        setProposal(res.data);
        updateTimeRemaining(res.data);
      })
      .catch(err => {
        console.error('Error fetching mediator proposal:', err);
        setError(err.response?.data?.error || 'Failed to fetch mediator proposal');
      })
      .finally(() => setLoading(false));
  };

  const updateTimeRemaining = (proposalData = proposal) => {
    if (!proposalData || !proposalData.deadline) return;

    const deadline = new Date(proposalData.deadline);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      setTimeRemaining(`${days}d ${hours}h ${minutes}m`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    } else {
      setTimeRemaining(`${minutes}m ${seconds}s`);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError(null);

    if (!proposalAmount || proposalAmount < 0) {
      setError('Please enter a valid settlement amount');
      return;
    }

    const deadlineDate = new Date(deadline);
    if (deadlineDate <= new Date()) {
      setError('Deadline must be in the future');
      return;
    }

    // Confirm if replacing existing proposal
    if (proposal) {
      const confirmed = window.confirm(
        `Replace existing mediator proposal?\n\n` +
        `Current Proposal: ${formatMoney(proposal.amount)}\n` +
        `New Proposal: ${formatMoney(proposalAmount)}\n\n` +
        `This will replace the existing proposal and reset all party responses.`
      );
      
      if (!confirmed) {
        return;
      }
    }

    const proposalData = {
      amount: proposalAmount,
      deadline: deadline,
      notes: notes
    };

    setLoading(true);
    axios.post(`${API_BASE_URL}/negotiations/${negotiationId}/mediator-proposal`, proposalData, getAxiosConfig())
      .then(res => {
        setProposal(res.data);
        setProposalAmount(null);
        setDeadline('');
        setNotes('');
        setShowForm(false);
      })
      .catch(err => {
        console.error('Error creating mediator proposal:', err);
        setError(err.response?.data?.details?.[0] || err.response?.data?.error || 'Failed to create proposal');
      })
      .finally(() => setLoading(false));
  };

  const handleResponse = (party, response) => {
    setError(null);
    setLoading(true);
    axios.put(
      `${API_BASE_URL}/negotiations/${negotiationId}/mediator-proposal`,
      { party, response },
      getAxiosConfig()
    )
      .then(res => {
        setProposal(res.data);
      })
      .catch(err => {
        console.error('Error updating proposal:', err);
        setError(err.response?.data?.error || 'Failed to update proposal');
      })
      .finally(() => setLoading(false));
  };

  // Use formatMoney from utility
  const formatCurrency = formatMoney;

  const getStatusDisplay = () => {
    if (!proposal) return null;

    switch (proposal.status) {
      case 'pending':
        return <span className="status-badge status-pending">⏳ Pending</span>;
      case 'accepted_plaintiff':
        return <span className="status-badge status-partial">✓ Plaintiff Accepted</span>;
      case 'accepted_defendant':
        return <span className="status-badge status-partial">✓ Defendant Accepted</span>;
      case 'accepted_both':
        return <span className="status-badge status-accepted">✓✓ Both Accepted</span>;
      case 'rejected':
        return <span className="status-badge status-rejected">✗ Rejected</span>;
      case 'expired':
        return <span className="status-badge status-expired">⏰ Expired</span>;
      default:
        return <span className="status-badge">{proposal.status}</span>;
    }
  };

  return (
    <div className="mediator-proposal">
      <div className="mediator-header">
        <h3>Mediator&apos;s Proposal</h3>
        {!proposal && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
            aria-label={showForm ? 'Cancel proposal creation' : 'Create new mediator proposal'}
          >
            {showForm ? 'Cancel' : 'Create Proposal'}
          </button>
        )}
      </div>

      {error && <div className="error-message" role="alert">{error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="mediator-form" aria-label="Create mediator proposal">
          <div className="form-group">
            <label htmlFor="proposal-amount">Settlement Amount ($)</label>
            <input
              id="proposal-amount"
              type="text"
              value={amountInput.displayValue}
              onChange={amountInput.onChange}
              onBlur={amountInput.onBlur}
              required
              placeholder="e.g., 1.5M, 1500000"
              aria-label="Settlement amount in dollars"
            />
            {amountInput.error && <span className="input-error">{amountInput.error}</span>}
            <small className="input-hint">Supports shorthand: 50k, 2M, etc.</small>
          </div>

          <div className="form-group">
            <label htmlFor="proposal-deadline">Deadline</label>
            <input
              id="proposal-deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
              aria-label="Proposal deadline date and time"
            />
          </div>

          <div className="form-group">
            <label htmlFor="proposal-notes">Notes</label>
            <textarea
              id="proposal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this proposal..."
              rows="3"
              aria-label="Optional notes about the proposal"
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Proposal'}
          </button>
        </form>
      )}

      {loading && !proposal ? (
        <p className="loading-message">Loading proposal...</p>
      ) : !proposal && !showForm ? (
        <p className="empty-message">No mediator proposal yet. Click &ldquo;Create Proposal&rdquo; to add one.</p>
      ) : proposal ? (
        <div className={`proposal-card proposal-${proposal.status}`}>
          <div className="proposal-header-section">
            <div className="proposal-amount">
              {formatCurrency(proposal.amount)}
            </div>
            {getStatusDisplay()}
          </div>

          <div className="proposal-deadline">
            <div className="deadline-label">Deadline:</div>
            <div className="deadline-value">
              {new Date(proposal.deadline).toLocaleString()}
            </div>
            {proposal.status === 'pending' && (
              <div className={`time-remaining ${timeRemaining === 'Expired' ? 'expired' : ''}`}>
                {timeRemaining === 'Expired' ? '⏰ Expired' : `⏱️ ${timeRemaining} remaining`}
              </div>
            )}
          </div>

          {proposal.notes && (
            <div className="proposal-notes">
              <strong>Notes:</strong> {proposal.notes}
            </div>
          )}

          <div className="proposal-responses">
            <div className="response-item">
              <span className="response-label">Plaintiff:</span>
              <span className={`response-value response-${proposal.plaintiff_response || 'pending'}`}>
                {proposal.plaintiff_response === 'accepted' ? '✓ Accepted' : 
                 proposal.plaintiff_response === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
              </span>
            </div>
            <div className="response-item">
              <span className="response-label">Defendant:</span>
              <span className={`response-value response-${proposal.defendant_response || 'pending'}`}>
                {proposal.defendant_response === 'accepted' ? '✓ Accepted' : 
                 proposal.defendant_response === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
              </span>
            </div>
          </div>

          {proposal.status === 'pending' && timeRemaining !== 'Expired' && (
            <div className="proposal-actions">
              <div className="action-section">
                <h5>Plaintiff Response:</h5>
                <div className="action-buttons">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleResponse('plaintiff', 'accepted')}
                    disabled={loading || proposal.plaintiff_response === 'accepted'}
                  >
                    ✓ Accept
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleResponse('plaintiff', 'rejected')}
                    disabled={loading || proposal.plaintiff_response === 'rejected'}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
              <div className="action-section">
                <h5>Defendant Response:</h5>
                <div className="action-buttons">
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleResponse('defendant', 'accepted')}
                    disabled={loading || proposal.defendant_response === 'accepted'}
                  >
                    ✓ Accept
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleResponse('defendant', 'rejected')}
                    disabled={loading || proposal.defendant_response === 'rejected'}
                  >
                    ✗ Reject
                  </button>
                </div>
              </div>
            </div>
          )}

          {proposal && (
            <div className="proposal-replace">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => {
                  setShowForm(true);
                  setProposalAmount(proposal.amount);
                  setDeadline(new Date(proposal.deadline).toISOString().slice(0, 16));
                  setNotes(proposal.notes || '');
                }}
              >
                Replace Proposal
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default MediatorProposal;
