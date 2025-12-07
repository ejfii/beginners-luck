import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import '../styles/InsurerHistory.css';
import { formatMoney } from '../utils/money';

function InsurerHistory({ negotiation, token }) {
  const [insurerData, setInsurerData] = useState(null);
  const [adjusterData, setAdjusterData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('insurer'); // 'insurer' or 'adjuster'

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  // Get the primary insurer and adjuster
  const primaryInsurer = negotiation?.primary_insurer_name;
  const primaryAdjuster = negotiation?.primary_adjuster_name;

  const fetchInsurerData = useCallback(async (insurerName) => {
    if (!insurerName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/analytics/insurer/${encodeURIComponent(insurerName)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setInsurerData(response.data);
    } catch (err) {
      console.error('Error fetching insurer data:', err);
      setError('Failed to load insurer history');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  const fetchAdjusterData = useCallback(async (adjusterName) => {
    if (!adjusterName) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.get(
        `${API_BASE_URL}/analytics/adjuster/${encodeURIComponent(adjusterName)}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      setAdjusterData(response.data);
    } catch (err) {
      console.error('Error fetching adjuster data:', err);
      setError('Failed to load adjuster history');
    } finally {
      setLoading(false);
    }
  }, [API_BASE_URL, token]);

  useEffect(() => {
    if (primaryInsurer && activeTab === 'insurer') {
      fetchInsurerData(primaryInsurer);
    }
  }, [primaryInsurer, activeTab, fetchInsurerData]);

  useEffect(() => {
    if (primaryAdjuster && activeTab === 'adjuster') {
      fetchAdjusterData(primaryAdjuster);
    }
  }, [primaryAdjuster, activeTab, fetchAdjusterData]);

  if (!primaryInsurer && !primaryAdjuster) {
    return null; // Don't show component if no insurer/adjuster data
  }

  const renderInsurerTab = () => {
    if (!primaryInsurer) {
      return <div className="no-data">No insurer information available</div>;
    }

    if (loading) {
      return <div className="loading">Loading insurer history...</div>;
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    if (!insurerData || insurerData.total_cases === 0) {
      return (
        <div className="no-history">
          <p>No previous cases with <strong>{primaryInsurer}</strong></p>
          <p className="hint">This is your first negotiation with this insurer.</p>
        </div>
      );
    }

    const stats = insurerData.statistics;

    return (
      <div className="history-content">
        <div className="history-header">
          <h4>📊 History with {insurerData.insurer_name}</h4>
          <div className="case-counts">
            <span className="badge badge-total">{insurerData.total_cases} Total</span>
            <span className="badge badge-settled">{insurerData.settled_cases} Settled</span>
            <span className="badge badge-active">{insurerData.active_cases} Active</span>
          </div>
        </div>

        <div className="stats-grid">
          {stats.avg_settlement && (
            <div className="stat-card">
              <div className="stat-label">Avg Settlement</div>
              <div className="stat-value">{formatMoney(stats.avg_settlement)}</div>
            </div>
          )}
          
          {stats.settlement_rate !== null && (
            <div className="stat-card">
              <div className="stat-label">Settlement Rate</div>
              <div className="stat-value">{stats.settlement_rate.toFixed(0)}%</div>
            </div>
          )}
          
          {stats.avg_duration_days && (
            <div className="stat-card">
              <div className="stat-label">Avg Duration</div>
              <div className="stat-value">{Math.round(stats.avg_duration_days)} days</div>
            </div>
          )}
          
          {stats.avg_policy_limit && (
            <div className="stat-card">
              <div className="stat-label">Avg Policy Limit</div>
              <div className="stat-value">{formatMoney(stats.avg_policy_limit)}</div>
            </div>
          )}

          {stats.total_moves_avg && (
            <div className="stat-card">
              <div className="stat-label">Avg Moves/Case</div>
              <div className="stat-value">{stats.total_moves_avg.toFixed(1)}</div>
            </div>
          )}
        </div>

        {insurerData.cases.length > 0 && (
          <div className="past-cases">
            <h5>Past Cases</h5>
            <div className="cases-list">
              {insurerData.cases.slice(0, 5).map(c => (
                <div key={c.id} className={`case-item case-${c.status}`}>
                  <div className="case-name">{c.name}</div>
                  <div className="case-details">
                    {c.settlement_amount && (
                      <span className="settlement">{formatMoney(c.settlement_amount)}</span>
                    )}
                    <span className="duration">{c.duration_days} days</span>
                    <span className={`status status-${c.status}`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
            {insurerData.cases.length > 5 && (
              <p className="more-cases">+ {insurerData.cases.length - 5} more cases</p>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderAdjusterTab = () => {
    if (!primaryAdjuster) {
      return <div className="no-data">No adjuster information available</div>;
    }

    if (loading) {
      return <div className="loading">Loading adjuster history...</div>;
    }

    if (error) {
      return <div className="error-message">{error}</div>;
    }

    if (!adjusterData || adjusterData.total_cases === 0) {
      return (
        <div className="no-history">
          <p>No previous cases with <strong>{primaryAdjuster}</strong></p>
          <p className="hint">This is your first negotiation with this adjuster.</p>
        </div>
      );
    }

    const stats = adjusterData.statistics;
    const patterns = adjusterData.patterns;

    return (
      <div className="history-content">
        <div className="history-header">
          <h4>👤 History with {adjusterData.adjuster_name}</h4>
          <div className="case-counts">
            <span className="badge badge-total">{adjusterData.total_cases} Total</span>
            <span className="badge badge-settled">{adjusterData.settled_cases} Settled</span>
            <span className="badge badge-active">{adjusterData.active_cases} Active</span>
          </div>
        </div>

        {/* Negotiation Patterns */}
        <div className="patterns-section">
          <h5>🎯 Negotiation Style</h5>
          <div className="patterns-grid">
            {patterns.aggressive_negotiator && (
              <div className="pattern-badge pattern-aggressive">
                ⚔️ Aggressive Negotiator
                <span className="pattern-hint">Typically makes low initial offers</span>
              </div>
            )}
            {patterns.quick_settler && (
              <div className="pattern-badge pattern-quick">
                ⚡ Quick Settler
                <span className="pattern-hint">Usually resolves cases in under 30 days</span>
              </div>
            )}
            {patterns.policy_limits_comfortable && (
              <div className="pattern-badge pattern-policy">
                💰 Policy Limits Comfortable
                <span className="pattern-hint">Often settles near policy limits</span>
              </div>
            )}
            {!patterns.aggressive_negotiator && !patterns.quick_settler && !patterns.policy_limits_comfortable && (
              <div className="pattern-badge pattern-neutral">
                📊 Standard Negotiator
                <span className="pattern-hint">Follows typical negotiation patterns</span>
              </div>
            )}
          </div>
        </div>

        {/* Statistics */}
        <div className="stats-grid">
          {stats.avg_settlement && (
            <div className="stat-card">
              <div className="stat-label">Avg Settlement</div>
              <div className="stat-value">{formatMoney(stats.avg_settlement)}</div>
            </div>
          )}
          
          {stats.avg_first_move_percentage && (
            <div className="stat-card">
              <div className="stat-label">Typical First Offer</div>
              <div className="stat-value">{stats.avg_first_move_percentage.toFixed(0)}%</div>
              <div className="stat-hint">of initial demand</div>
            </div>
          )}
          
          {stats.avg_moves_to_settle && (
            <div className="stat-card">
              <div className="stat-label">Moves to Settle</div>
              <div className="stat-value">{stats.avg_moves_to_settle.toFixed(1)}</div>
            </div>
          )}
          
          {stats.avg_duration_days && (
            <div className="stat-card">
              <div className="stat-label">Avg Duration</div>
              <div className="stat-value">{Math.round(stats.avg_duration_days)} days</div>
            </div>
          )}

          {stats.settlement_rate !== null && (
            <div className="stat-card">
              <div className="stat-label">Settlement Rate</div>
              <div className="stat-value">{stats.settlement_rate.toFixed(0)}%</div>
            </div>
          )}
        </div>

        {/* Strategy Insight */}
        {stats.avg_first_move_percentage && (
          <div className="strategy-insight">
            <h5>💡 Strategy Insight</h5>
            <p>
              This adjuster typically offers <strong>{stats.avg_first_move_percentage.toFixed(0)}%</strong> of 
              the initial demand on their first move. 
              {stats.avg_first_move_percentage < 40 && ' Consider starting with a higher demand to account for their low initial offers.'}
              {stats.avg_first_move_percentage >= 40 && stats.avg_first_move_percentage < 60 && ' This is a moderate starting point that usually leads to productive negotiations.'}
              {stats.avg_first_move_percentage >= 60 && ' This is a strong initial offer - they may be motivated to settle quickly.'}
            </p>
            {patterns.quick_settler && (
              <p>
                They tend to settle cases in about <strong>{Math.round(stats.avg_duration_days)} days</strong>, 
                suggesting they have authority to move quickly.
              </p>
            )}
          </div>
        )}

        {/* Past Cases */}
        {adjusterData.cases.length > 0 && (
          <div className="past-cases">
            <h5>Past Cases</h5>
            <div className="cases-list">
              {adjusterData.cases.slice(0, 5).map(c => (
                <div key={c.id} className={`case-item case-${c.status}`}>
                  <div className="case-name">{c.name}</div>
                  <div className="case-details">
                    {c.settlement_amount && (
                      <span className="settlement">{formatMoney(c.settlement_amount)}</span>
                    )}
                    {c.first_move_percentage && (
                      <span className="first-move">1st: {c.first_move_percentage.toFixed(0)}%</span>
                    )}
                    <span className="moves">{c.total_moves} moves</span>
                    <span className={`status status-${c.status}`}>{c.status}</span>
                  </div>
                </div>
              ))}
            </div>
            {adjusterData.cases.length > 5 && (
              <p className="more-cases">+ {adjusterData.cases.length - 5} more cases</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="insurer-history">
      <div className="history-tabs">
        <button
          className={`tab-button ${activeTab === 'insurer' ? 'active' : ''}`}
          onClick={() => setActiveTab('insurer')}
          disabled={!primaryInsurer}
        >
          🏢 Insurer History
        </button>
        <button
          className={`tab-button ${activeTab === 'adjuster' ? 'active' : ''}`}
          onClick={() => setActiveTab('adjuster')}
          disabled={!primaryAdjuster}
        >
          👤 Adjuster History
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'insurer' ? renderInsurerTab() : renderAdjusterTab()}
      </div>
    </div>
  );
}

export default InsurerHistory;
