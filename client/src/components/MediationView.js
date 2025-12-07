import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/MediationView.css';

/**
 * MediationView - A focused, print-friendly view for mediators and parties
 * Displays key case facts, move timeline, brackets, and mediator proposal
 */
function MediationView({ negotiationId, negotiation, token, onClose }) {
  const [data, setData] = useState({
    negotiation: negotiation || null,
    moves: [],
    brackets: [],
    mediatorProposal: null
  });
  const [loading, setLoading] = useState(!negotiation);
  const [error, setError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState('');

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  useEffect(() => {
    fetchMediationData();
  }, [negotiationId]);

  useEffect(() => {
    if (data.mediatorProposal && data.mediatorProposal.status === 'pending') {
      const interval = setInterval(() => {
        updateTimeRemaining();
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [data.mediatorProposal]);

  const fetchMediationData = async () => {
    setLoading(true);
    setError(null);

    try {
      // If we already have negotiation data, just fetch related data
      let negotiationData = data.negotiation;
      
      if (!negotiationData) {
        const negResponse = await axios.get(
          `${API_BASE_URL}/negotiations/${negotiationId}`,
          getAxiosConfig()
        );
        negotiationData = negResponse.data;
      }

      // Fetch moves, brackets, and mediator proposal in parallel
      const [movesResponse, bracketsResponse, proposalResponse] = await Promise.allSettled([
        axios.get(`${API_BASE_URL}/moves/${negotiationId}`, getAxiosConfig()),
        axios.get(`${API_BASE_URL}/negotiations/${negotiationId}/brackets`, getAxiosConfig()),
        axios.get(`${API_BASE_URL}/negotiations/${negotiationId}/mediator-proposal`, getAxiosConfig())
      ]);

      setData({
        negotiation: negotiationData,
        moves: movesResponse.status === 'fulfilled' ? movesResponse.value.data : [],
        brackets: bracketsResponse.status === 'fulfilled' ? bracketsResponse.value.data : [],
        mediatorProposal: proposalResponse.status === 'fulfilled' ? proposalResponse.value.data : null
      });
    } catch (err) {
      console.error('Error fetching mediation data:', err);
      setError(err.response?.data?.error || 'Failed to load mediation data');
    } finally {
      setLoading(false);
    }
  };

  const updateTimeRemaining = () => {
    if (!data.mediatorProposal || !data.mediatorProposal.deadline) return;

    const deadline = new Date(data.mediatorProposal.deadline);
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      setTimeRemaining('Expired');
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      setTimeRemaining(`${days} day${days > 1 ? 's' : ''}, ${hours} hour${hours !== 1 ? 's' : ''}`);
    } else if (hours > 0) {
      setTimeRemaining(`${hours} hour${hours !== 1 ? 's' : ''}, ${minutes} minute${minutes !== 1 ? 's' : ''}`);
    } else {
      setTimeRemaining(`${minutes} minute${minutes !== 1 ? 's' : ''}`);
    }
  };

  const formatCurrency = (amount) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMediatorProposalStatusText = () => {
    if (!data.mediatorProposal) return null;

    const { status, plaintiff_response, defendant_response } = data.mediatorProposal;

    if (status === 'accepted_both') {
      return 'Accepted by Both Parties';
    } else if (status === 'rejected') {
      return 'Rejected by One or Both Parties';
    } else if (status === 'expired') {
      return 'Expired';
    } else if (status === 'pending') {
      const pStatus = plaintiff_response === 'accepted' ? 'Plaintiff: Accepted' : 'Plaintiff: Pending';
      const dStatus = defendant_response === 'accepted' ? 'Defendant: Accepted' : 'Defendant: Pending';
      return `${pStatus}, ${dStatus}`;
    }
    return status;
  };

  const calculateTotalDamages = (neg) => {
    if (!neg) return 0;
    return (neg.past_medical_bills || 0) +
           (neg.future_medical_bills || 0) +
           (neg.lcp || 0) +
           (neg.lost_wages || 0) +
           (neg.loss_earning_capacity || 0);
  };

  const getLatestMoves = () => {
    // Get the 5 most recent moves
    return [...data.moves].reverse().slice(0, 5);
  };

  const getActiveBrackets = () => {
    return data.brackets.filter(b => b.status === 'active').slice(0, 3);
  };

  if (loading) {
    return (
      <div className="mediation-view">
        <div className="mediation-header no-print">
          <h1>Mediation View</h1>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close Mediation View">
            ✕ Close
          </button>
        </div>
        <div className="loading-state">Loading mediation data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mediation-view">
        <div className="mediation-header no-print">
          <h1>Mediation View</h1>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close Mediation View">
            ✕ Close
          </button>
        </div>
        <div className="error-state">{error}</div>
      </div>
    );
  }

  const { negotiation: neg } = data;

  if (!neg) {
    return (
      <div className="mediation-view">
        <div className="mediation-header no-print">
          <h1>Mediation View</h1>
          <button className="btn btn-secondary" onClick={onClose} aria-label="Close Mediation View">
            ✕ Close
          </button>
        </div>
        <div className="error-state">Negotiation not found</div>
      </div>
    );
  }

  return (
    <div className="mediation-view">
      {/* Header - Hidden when printing */}
      <div className="mediation-header no-print">
        <h1>Mediation View</h1>
        <div className="header-actions">
          <button 
            className="btn btn-secondary" 
            onClick={() => window.print()}
            aria-label="Print this view"
          >
            🖨️ Print
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={onClose}
            aria-label="Close Mediation View"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Main Content - Optimized for printing */}
      <div className="mediation-content">
        {/* Case Header */}
        <header className="case-header">
          <h2 className="case-title">{neg.name}</h2>
          <div className="case-meta">
            <span className="case-status" aria-label={`Case status: ${neg.status}`}>
              Status: {neg.status.charAt(0).toUpperCase() + neg.status.slice(1)}
            </span>
            <span className="case-date">Created: {formatDate(neg.created_date)}</span>
          </div>
        </header>

        {/* Key Case Facts */}
        <section className="case-facts" aria-labelledby="case-facts-heading">
          <h3 id="case-facts-heading">Case Facts</h3>
          <div className="facts-grid">
            <div className="fact-item">
              <label>Venue</label>
              <div className="fact-value">{neg.venue || 'Not specified'}</div>
            </div>
            <div className="fact-item">
              <label>Plaintiff Attorney</label>
              <div className="fact-value">{neg.plaintiff_attorney || 'Not specified'}</div>
            </div>
            <div className="fact-item">
              <label>Defendant Attorney</label>
              <div className="fact-value">{neg.defendant_attorney || 'Not specified'}</div>
            </div>
            <div className="fact-item">
              <label>Mediator</label>
              <div className="fact-value">{neg.mediator || 'Not assigned'}</div>
            </div>
            <div className="fact-item">
              <label>Judge</label>
              <div className="fact-value">{neg.judge || 'Not assigned'}</div>
            </div>
            <div className="fact-item">
              <label>Defendant Type</label>
              <div className="fact-value">{neg.defendant_type || 'Not specified'}</div>
            </div>
            <div className="fact-item">
              <label>Total Damages</label>
              <div className="fact-value fact-highlight">{formatCurrency(calculateTotalDamages(neg))}</div>
            </div>
          </div>

          {/* Insurance Coverage */}
          {(neg.primary_coverage_limit || neg.umbrella_coverage_limit || neg.uim_coverage_limit) && (
            <div className="insurance-coverage-section">
              <h4>Insurance Coverage</h4>
              <div className="coverage-grid">
                {neg.primary_coverage_limit && (
                  <div className="coverage-layer">
                    <div className="coverage-header">Primary Insurance</div>
                    <div className="coverage-details">
                      <div className="coverage-item">
                        <span className="coverage-label">Limit:</span>
                        <span className="coverage-value">{formatCurrency(neg.primary_coverage_limit)}</span>
                      </div>
                      {neg.primary_insurer_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Insurer:</span>
                          <span className="coverage-value">{neg.primary_insurer_name}</span>
                        </div>
                      )}
                      {neg.primary_adjuster_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Adjuster:</span>
                          <span className="coverage-value">{neg.primary_adjuster_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {neg.umbrella_coverage_limit && (
                  <div className="coverage-layer">
                    <div className="coverage-header">Umbrella / Excess</div>
                    <div className="coverage-details">
                      <div className="coverage-item">
                        <span className="coverage-label">Limit:</span>
                        <span className="coverage-value">{formatCurrency(neg.umbrella_coverage_limit)}</span>
                      </div>
                      {neg.umbrella_insurer_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Insurer:</span>
                          <span className="coverage-value">{neg.umbrella_insurer_name}</span>
                        </div>
                      )}
                      {neg.umbrella_adjuster_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Adjuster:</span>
                          <span className="coverage-value">{neg.umbrella_adjuster_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                {neg.uim_coverage_limit && (
                  <div className="coverage-layer">
                    <div className="coverage-header">UM/UIM Coverage</div>
                    <div className="coverage-details">
                      <div className="coverage-item">
                        <span className="coverage-label">Limit:</span>
                        <span className="coverage-value">{formatCurrency(neg.uim_coverage_limit)}</span>
                      </div>
                      {neg.uim_insurer_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Insurer:</span>
                          <span className="coverage-value">{neg.uim_insurer_name}</span>
                        </div>
                      )}
                      {neg.uim_adjuster_name && (
                        <div className="coverage-item">
                          <span className="coverage-label">Adjuster:</span>
                          <span className="coverage-value">{neg.uim_adjuster_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {neg.injury_description && (
            <div className="injury-summary">
              <h4>Injury Summary</h4>
              <p>{neg.injury_description}</p>
            </div>
          )}

          {/* Damages Breakdown */}
          <div className="damages-breakdown">
            <h4>Damages Breakdown</h4>
            <table className="damages-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {neg.past_medical_bills > 0 && (
                  <tr>
                    <td>Past Medical Bills</td>
                    <td>{formatCurrency(neg.past_medical_bills)}</td>
                  </tr>
                )}
                {neg.future_medical_bills > 0 && (
                  <tr>
                    <td>Future Medical Bills</td>
                    <td>{formatCurrency(neg.future_medical_bills)}</td>
                  </tr>
                )}
                {neg.lcp > 0 && (
                  <tr>
                    <td>Life Care Plan</td>
                    <td>{formatCurrency(neg.lcp)}</td>
                  </tr>
                )}
                {neg.lost_wages > 0 && (
                  <tr>
                    <td>Lost Wages</td>
                    <td>{formatCurrency(neg.lost_wages)}</td>
                  </tr>
                )}
                {neg.loss_earning_capacity > 0 && (
                  <tr>
                    <td>Loss of Earning Capacity</td>
                    <td>{formatCurrency(neg.loss_earning_capacity)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Move Timeline */}
        <section className="move-timeline" aria-labelledby="move-timeline-heading">
          <h3 id="move-timeline-heading">Recent Negotiation Moves</h3>
          {data.moves.length === 0 ? (
            <p className="empty-message">No moves recorded yet</p>
          ) : (
            <div className="timeline">
              {getLatestMoves().map((move, index) => (
                <div key={move.id} className={`timeline-item ${move.party}`}>
                  <div className="timeline-marker" aria-hidden="true">
                    {move.party === 'plaintiff' ? '👤' : '🏢'}
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-header">
                      <span className="party-label">
                        {move.party === 'plaintiff' ? 'Plaintiff' : 'Defendant'}
                      </span>
                      <span className="move-type">
                        {move.type === 'demand' ? 'Demand' : 'Offer'}
                      </span>
                      <span className="move-date">{formatDate(move.timestamp)}</span>
                    </div>
                    <div className="move-amount">{formatCurrency(move.amount)}</div>
                    {move.notes && <div className="move-notes">{move.notes}</div>}
                  </div>
                </div>
              ))}
              {data.moves.length > 5 && (
                <p className="timeline-note">Showing 5 most recent of {data.moves.length} total moves</p>
              )}
            </div>
          )}
        </section>

        {/* Bracket Proposals */}
        {data.brackets.length > 0 && (
          <section className="bracket-summary" aria-labelledby="bracket-summary-heading">
            <h3 id="bracket-summary-heading">Active Bracket Proposals</h3>
            {getActiveBrackets().length === 0 ? (
              <p className="empty-message">No active bracket proposals</p>
            ) : (
              <div className="brackets-list">
                {getActiveBrackets().map((bracket) => (
                  <div key={bracket.id} className="bracket-card">
                    <div className="bracket-status">
                      <span className={`status-badge status-${bracket.status}`}>
                        {bracket.status.charAt(0).toUpperCase() + bracket.status.slice(1)}
                      </span>
                      <span className="bracket-date">
                        Created: {formatDate(bracket.created_at)}
                      </span>
                    </div>
                    <div className="bracket-ranges">
                      <div className="range-section">
                        <h5>Plaintiff Range</h5>
                        <div className="range-values">
                          {formatCurrency(bracket.plaintiff_low)} - {formatCurrency(bracket.plaintiff_high)}
                        </div>
                      </div>
                      <div className="range-section">
                        <h5>Defendant Range</h5>
                        <div className="range-values">
                          {formatCurrency(bracket.defendant_low)} - {formatCurrency(bracket.defendant_high)}
                        </div>
                      </div>
                    </div>
                    {bracket.notes && (
                      <div className="bracket-notes">
                        <strong>Notes:</strong> {bracket.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Mediator Proposal */}
        {data.mediatorProposal && (
          <section className="mediator-proposal-summary" aria-labelledby="mediator-proposal-heading">
            <h3 id="mediator-proposal-heading">Mediator Proposal</h3>
            <div className="proposal-card">
              <div className="proposal-header">
                <div className="proposal-amount-large">
                  {formatCurrency(data.mediatorProposal.amount)}
                </div>
                <div className="proposal-status">
                  <span 
                    className={`status-badge status-${data.mediatorProposal.status}`}
                    aria-label={`Proposal status: ${data.mediatorProposal.status}`}
                  >
                    {data.mediatorProposal.status === 'pending' && '⏳ '}
                    {data.mediatorProposal.status === 'accepted_both' && '✓✓ '}
                    {data.mediatorProposal.status === 'rejected' && '✗ '}
                    {data.mediatorProposal.status === 'expired' && '⏰ '}
                    {getMediatorProposalStatusText()}
                  </span>
                </div>
              </div>

              <div className="proposal-details">
                <div className="detail-row">
                  <label>Deadline</label>
                  <span>{formatDate(data.mediatorProposal.deadline)}</span>
                </div>
                {data.mediatorProposal.status === 'pending' && timeRemaining && (
                  <div className="detail-row time-remaining">
                    <label>Time Remaining</label>
                    <span className="countdown">{timeRemaining}</span>
                  </div>
                )}
                <div className="detail-row">
                  <label>Plaintiff Response</label>
                  <span className={`response-status response-${data.mediatorProposal.plaintiff_response}`}>
                    {data.mediatorProposal.plaintiff_response === 'accepted' ? '✓ Accepted' : 
                     data.mediatorProposal.plaintiff_response === 'rejected' ? '✗ Rejected' : 
                     'Pending'}
                  </span>
                </div>
                <div className="detail-row">
                  <label>Defendant Response</label>
                  <span className={`response-status response-${data.mediatorProposal.defendant_response}`}>
                    {data.mediatorProposal.defendant_response === 'accepted' ? '✓ Accepted' : 
                     data.mediatorProposal.defendant_response === 'rejected' ? '✗ Rejected' : 
                     'Pending'}
                  </span>
                </div>
              </div>

              {data.mediatorProposal.notes && (
                <div className="proposal-notes">
                  <strong>Notes:</strong> {data.mediatorProposal.notes}
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Footer - Print only */}
      <footer className="print-only mediation-footer">
        <p>Generated: {new Date().toLocaleString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}</p>
        <p>Negotiation Engine - Mediation View</p>
      </footer>
    </div>
  );
}

export default MediationView;
