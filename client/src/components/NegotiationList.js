import React from 'react';
import '../styles/App.css';

function NegotiationList({ negotiations, selectedId, onSelect }) {
  return (
    <div className="negotiation-list">
      <h3>Negotiations</h3>
      {negotiations.length === 0 ? (
        <p className="empty-message">No negotiations found</p>
      ) : (
        <ul>
          {negotiations.map(neg => (
            <li
              key={neg.id}
              className={`negotiation-item ${selectedId === neg.id ? 'selected' : ''}`}
              onClick={() => onSelect(neg)}
            >
              <div className="item-header">
                <strong>{neg.name}</strong>
                <span className={`status-badge status-${neg.status}`}>
                  {neg.status}
                </span>
              </div>
              <small>{neg.plaintiff_attorney || 'N/A'}</small>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default NegotiationList;
