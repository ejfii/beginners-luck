import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ActivityTimeline.css';

/**
 * ActivityTimeline Component
 * Displays a chronological feed of all case activities:
 * - Moves (offers/demands)
 * - Bracket proposals
 * - Mediator proposals
 */
function ActivityTimeline({ negotiationId }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!negotiationId) return;

    const fetchActivities = async () => {
      try {
        setLoading(true);
        setError(null);
        const token = localStorage.getItem('token');
        
        const response = await axios.get(
          `http://localhost:5001/api/negotiations/${negotiationId}/activity`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        setActivities(response.data.activities || []);
      } catch (err) {
        console.error('Error fetching activity timeline:', err);
        setError('Failed to load activity timeline');
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [negotiationId]);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderActivityItem = (activity) => {
    const { type, data, timestamp } = activity;

    switch (type) {
      case 'move':
        return (
          <div className="activity-item move-activity">
            <div className="activity-icon">💼</div>
            <div className="activity-content">
              <div className="activity-header">
                <strong>{data.party}</strong> made a {data.moveType}
              </div>
              <div className="activity-amount">{formatCurrency(data.amount)}</div>
              {data.notes && <div className="activity-notes">{data.notes}</div>}
              <div className="activity-timestamp">{formatTimestamp(timestamp)}</div>
            </div>
          </div>
        );

      case 'bracket':
        return (
          <div className="activity-item bracket-activity">
            <div className="activity-icon">📊</div>
            <div className="activity-content">
              <div className="activity-header">
                <strong>Bracket Proposal</strong> {data.proposedBy ? `by ${data.proposedBy}` : ''}
              </div>
              <div className="bracket-details">
                <span className="bracket-plaintiff">
                  Plaintiff: {formatCurrency(data.plaintiffAmount)}
                </span>
                {' → '}
                <span className="bracket-defendant">
                  Defendant: {formatCurrency(data.defendantAmount)}
                </span>
              </div>
              <div className="activity-status">Status: {data.status || 'active'}</div>
              {data.notes && <div className="activity-notes">{data.notes}</div>}
              <div className="activity-timestamp">{formatTimestamp(timestamp)}</div>
            </div>
          </div>
        );

      case 'mediator_proposal':
        return (
          <div className="activity-item mediator-activity">
            <div className="activity-icon">⚖️</div>
            <div className="activity-content">
              <div className="activity-header">
                <strong>Mediator Proposal</strong>
              </div>
              <div className="activity-amount">{formatCurrency(data.amount)}</div>
              <div className="proposal-details">
                <div>Deadline: {formatTimestamp(data.deadline)}</div>
                <div>Status: {data.status || 'pending'}</div>
                {data.plaintiffResponse && (
                  <div>Plaintiff Response: {data.plaintiffResponse}</div>
                )}
                {data.defendantResponse && (
                  <div>Defendant Response: {data.defendantResponse}</div>
                )}
              </div>
              {data.notes && <div className="activity-notes">{data.notes}</div>}
              <div className="activity-timestamp">{formatTimestamp(timestamp)}</div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return <div className="activity-timeline-loading">Loading activity timeline...</div>;
  }

  if (error) {
    return <div className="activity-timeline-error">{error}</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="activity-timeline-empty">
        <p>No activity yet. Start by adding moves, brackets, or mediator proposals.</p>
      </div>
    );
  }

  return (
    <div className="activity-timeline">
      <h3>Activity Timeline</h3>
      <div className="activity-list">
        {activities.map((activity) => (
          <div key={activity.id}>{renderActivityItem(activity)}</div>
        ))}
      </div>
      <div className="activity-count">
        Total activities: {activities.length}
      </div>
    </div>
  );
}

export default ActivityTimeline;
