/**
 * TemplateManager Component
 * Manage negotiation templates - list, create, delete
 */
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/TemplateManager.css';

function TemplateManager({ token, onCreateFromTemplate, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [caseName, setCaseName] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5001/api';

  const getAxiosConfig = () => ({
    headers: { Authorization: `Bearer ${token}` }
  });

  useEffect(() => {
    fetchTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchTemplates = () => {
    setLoading(true);
    setError(null);

    axios.get(`${API_BASE_URL}/templates`, getAxiosConfig())
      .then(res => {
        setTemplates(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching templates:', err);
        setError('Failed to load templates');
        setLoading(false);
      });
  };

  const handleDeleteTemplate = (templateId, templateName) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this template?\n\nTemplate: ${templateName}\n\nThis action cannot be undone.`
    );

    if (confirmed) {
      axios.delete(`${API_BASE_URL}/templates/${templateId}`, getAxiosConfig())
        .then(() => {
          setTemplates(templates.filter(t => t.id !== templateId));
        })
        .catch(err => {
          console.error('Error deleting template:', err);
          setError('Failed to delete template');
        });
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setCaseName('');
    setShowCreateModal(true);
  };

  const handleCreateFromTemplate = (e) => {
    e.preventDefault();

    if (!caseName.trim()) {
      setError('Case name is required');
      return;
    }

    axios.post(
      `${API_BASE_URL}/templates/${selectedTemplate.id}/create-negotiation`,
      { case_name: caseName },
      getAxiosConfig()
    )
      .then(res => {
        setShowCreateModal(false);
        setSelectedTemplate(null);
        setCaseName('');
        if (onCreateFromTemplate) {
          onCreateFromTemplate(res.data);
        }
      })
      .catch(err => {
        console.error('Error creating negotiation from template:', err);
        setError(err.response?.data?.error || 'Failed to create negotiation from template');
      });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="template-manager">
        <div className="template-header">
          <h2>Case Templates</h2>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
        <div className="loading">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="template-manager">
      <div className="template-header">
        <h2>Case Templates</h2>
        <button className="btn btn-secondary" onClick={onClose}>Close</button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {templates.length === 0 ? (
        <div className="empty-state">
          <p>No templates saved yet.</p>
          <p>You can save any negotiation as a template to reuse its setup later.</p>
        </div>
      ) : (
        <div className="templates-grid">
          {templates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-card-header">
                <h3>{template.name}</h3>
                <button
                  className="btn-icon btn-danger-icon"
                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                  title="Delete template"
                >
                  ×
                </button>
              </div>
              
              {template.description && (
                <p className="template-description">{template.description}</p>
              )}
              
              <div className="template-meta">
                <span className="template-date">Created: {formatDate(template.created_at)}</span>
              </div>

              <div className="template-preview">
                {template.template_data.defendant_type && (
                  <div className="preview-item">
                    <strong>Type:</strong> {template.template_data.defendant_type}
                  </div>
                )}
                {template.template_data.parties && (
                  <div className="preview-item">
                    <strong>Parties:</strong> {template.template_data.parties.length} configured
                  </div>
                )}
                {template.template_data.primary_coverage_limit && (
                  <div className="preview-item">
                    <strong>Coverage:</strong> ${template.template_data.primary_coverage_limit.toLocaleString()}
                  </div>
                )}
              </div>

              <button
                className="btn btn-primary btn-full-width"
                onClick={() => handleSelectTemplate(template)}
              >
                Use This Template
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && selectedTemplate && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Create Case from Template</h3>
            <p className="modal-subtitle">Using template: <strong>{selectedTemplate.name}</strong></p>
            
            <form onSubmit={handleCreateFromTemplate}>
              <div className="form-group">
                <label htmlFor="caseName">Case Name *</label>
                <input
                  id="caseName"
                  type="text"
                  value={caseName}
                  onChange={(e) => setCaseName(e.target.value)}
                  placeholder="e.g., Smith v. ABC Corp"
                  required
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Case
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default TemplateManager;
