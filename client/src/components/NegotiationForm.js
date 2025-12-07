import React, { useState } from 'react';
import '../styles/NegotiationForm.css';
import { 
  validateRequired, 
  validateMoneyAmount, 
  validateStringLength,
  VALIDATION_CONSTANTS 
} from '../utils/validation';
import ErrorMessage from './ErrorMessage';

function NegotiationForm({ onSubmit }) {
  const [formData, setFormData] = useState({
    name: '',
    plaintiff_attorney: '',
    defendant_attorney: '',
    mediator: '',
    venue: '',
    judge: '',
    coverage: '',
    primary_coverage_limit: '',
    primary_insurer_name: '',
    primary_adjuster_name: '',
    umbrella_coverage_limit: '',
    umbrella_insurer_name: '',
    umbrella_adjuster_name: '',
    uim_coverage_limit: '',
    uim_insurer_name: '',
    uim_adjuster_name: '',
    defendant_type: '',
    injury_description: '',
    past_medical_bills: 0,
    future_medical_bills: 0,
    lcp: 0,
    lost_wages: 0,
    loss_earning_capacity: 0,
    settlement_goal: 0,
    notes: ''
  });

  const [plaintiffs, setPlaintiffs] = useState([{ party_name: '', attorney_name: '', law_firm_name: '' }]);
  const [defendants, setDefendants] = useState([{ party_name: '', attorney_name: '', law_firm_name: '' }]);

  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numericFields = ['past_medical_bills', 'future_medical_bills', 'lcp', 'lost_wages', 'loss_earning_capacity', 
      'settlement_goal', 'primary_coverage_limit', 'umbrella_coverage_limit', 'uim_coverage_limit'];
    setFormData({
      ...formData,
      [name]: numericFields.includes(name) ? (parseFloat(value) || '') : value
    });
  };

  const handlePartyChange = (role, index, field, value) => {
    if (role === 'plaintiff') {
      const updated = [...plaintiffs];
      updated[index][field] = value;
      setPlaintiffs(updated);
    } else {
      const updated = [...defendants];
      updated[index][field] = value;
      setDefendants(updated);
    }
  };

  const addParty = (role) => {
    const newParty = { party_name: '', attorney_name: '', law_firm_name: '' };
    if (role === 'plaintiff') {
      setPlaintiffs([...plaintiffs, newParty]);
    } else {
      setDefendants([...defendants, newParty]);
    }
  };

  const removeParty = (role, index) => {
    if (role === 'plaintiff') {
      if (plaintiffs.length > 1) {
        setPlaintiffs(plaintiffs.filter((_, i) => i !== index));
      }
    } else {
      if (defendants.length > 1) {
        setDefendants(defendants.filter((_, i) => i !== index));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    const nameError = validateRequired(formData.name, 'Case name');
    if (nameError) newErrors.name = nameError;
    
    const nameLengthError = validateStringLength(formData.name, VALIDATION_CONSTANTS.MAX_STRING_LENGTH, 'Case name');
    if (nameLengthError) newErrors.name = nameLengthError;
    
    // Validate at least one plaintiff has a party name
    const validPlaintiffs = plaintiffs.filter(p => p.party_name.trim());
    if (validPlaintiffs.length === 0) {
      newErrors.plaintiffs = 'At least one plaintiff name is required';
    }
    
    // Validate money amounts if provided
    const moneyFields = [
      { field: 'past_medical_bills', value: formData.past_medical_bills },
      { field: 'future_medical_bills', value: formData.future_medical_bills },
      { field: 'lcp', value: formData.lcp },
      { field: 'lost_wages', value: formData.lost_wages },
      { field: 'loss_earning_capacity', value: formData.loss_earning_capacity },
      { field: 'settlement_goal', value: formData.settlement_goal },
      { field: 'primary_coverage_limit', value: formData.primary_coverage_limit },
      { field: 'umbrella_coverage_limit', value: formData.umbrella_coverage_limit },
      { field: 'uim_coverage_limit', value: formData.uim_coverage_limit }
    ];
    
    moneyFields.forEach(({ field, value }) => {
      if (value && value !== 0 && value !== '') {
        const error = validateMoneyAmount(value);
        if (error) newErrors[field] = error;
      }
    });
    
    return newErrors;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const newErrors = validateForm();
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
    } else {
      // Include parties in submission
      const dataToSubmit = {
        ...formData,
        parties: [
          ...plaintiffs.filter(p => p.party_name.trim()).map(p => ({ ...p, role: 'plaintiff' })),
          ...defendants.filter(d => d.party_name.trim()).map(d => ({ ...d, role: 'defendant' }))
        ]
      };
      onSubmit(dataToSubmit);
      
      // Reset form
      setFormData({
        name: '',
        plaintiff_attorney: '',
        defendant_attorney: '',
        mediator: '',
        venue: '',
        judge: '',
        coverage: '',
        primary_coverage_limit: '',
        primary_insurer_name: '',
        primary_adjuster_name: '',
        umbrella_coverage_limit: '',
        umbrella_insurer_name: '',
        umbrella_adjuster_name: '',
        uim_coverage_limit: '',
        uim_insurer_name: '',
        uim_adjuster_name: '',
        defendant_type: '',
        injury_description: '',
        past_medical_bills: 0,
        future_medical_bills: 0,
        lcp: 0,
        lost_wages: 0,
        loss_earning_capacity: 0,
        settlement_goal: 0,
        notes: ''
      });
      setPlaintiffs([{ party_name: '', attorney_name: '', law_firm_name: '' }]);
      setDefendants([{ party_name: '', attorney_name: '', law_firm_name: '' }]);
      setErrors({});
    }
  };

  return (
    <form onSubmit={handleSubmit} className="negotiation-form">
      <div className="form-row">
        <div className="form-group">
          <label>Case Name *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
          />
          <ErrorMessage error={errors.name} />
        </div>
      </div>

      <h4>Plaintiffs</h4>
      <ErrorMessage error={errors.plaintiffs} />
      {plaintiffs.map((plaintiff, index) => (
        <div key={index} className="party-group">
          <div className="form-row">
            <div className="form-group">
              <label>Plaintiff Name {plaintiffs.length > 1 ? `${index + 1}` : ''} *</label>
              <input
                type="text"
                value={plaintiff.party_name}
                onChange={(e) => handlePartyChange('plaintiff', index, 'party_name', e.target.value)}
                placeholder="e.g., John Doe"
              />
            </div>
            <div className="form-group">
              <label>Attorney Name</label>
              <input
                type="text"
                value={plaintiff.attorney_name}
                onChange={(e) => handlePartyChange('plaintiff', index, 'attorney_name', e.target.value)}
                placeholder="e.g., Jane Smith"
              />
            </div>
            <div className="form-group">
              <label>Law Firm</label>
              <input
                type="text"
                value={plaintiff.law_firm_name}
                onChange={(e) => handlePartyChange('plaintiff', index, 'law_firm_name', e.target.value)}
                placeholder="e.g., Smith & Associates"
              />
            </div>
            {plaintiffs.length > 1 && (
              <button
                type="button"
                className="btn btn-remove"
                onClick={() => removeParty('plaintiff', index)}
                title="Remove plaintiff"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => addParty('plaintiff')}>
        + Add Another Plaintiff
      </button>

      <h4>Defendants</h4>
      {defendants.map((defendant, index) => (
        <div key={index} className="party-group">
          <div className="form-row">
            <div className="form-group">
              <label>Defendant Name {defendants.length > 1 ? `${index + 1}` : ''}</label>
              <input
                type="text"
                value={defendant.party_name}
                onChange={(e) => handlePartyChange('defendant', index, 'party_name', e.target.value)}
                placeholder="e.g., ABC Corporation"
              />
            </div>
            <div className="form-group">
              <label>Attorney Name</label>
              <input
                type="text"
                value={defendant.attorney_name}
                onChange={(e) => handlePartyChange('defendant', index, 'attorney_name', e.target.value)}
                placeholder="e.g., Robert Johnson"
              />
            </div>
            <div className="form-group">
              <label>Law Firm</label>
              <input
                type="text"
                value={defendant.law_firm_name}
                onChange={(e) => handlePartyChange('defendant', index, 'law_firm_name', e.target.value)}
                placeholder="e.g., Johnson Law Group"
              />
            </div>
            {defendants.length > 1 && (
              <button
                type="button"
                className="btn btn-remove"
                onClick={() => removeParty('defendant', index)}
                title="Remove defendant"
              >
                ×
              </button>
            )}
          </div>
        </div>
      ))}
      <button type="button" className="btn btn-secondary" onClick={() => addParty('defendant')}>
        + Add Another Defendant
      </button>

      <div className="form-row">
        <div className="form-group">
          <label>Mediator</label>
          <input
            type="text"
            name="mediator"
            value={formData.mediator}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Judge</label>
          <input
            type="text"
            name="judge"
            value={formData.judge}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Venue</label>
          <input
            type="text"
            name="venue"
            value={formData.venue}
            onChange={handleChange}
          />
        </div>
        <div className="form-group">
          <label>Defendant Type</label>
          <select name="defendant_type" value={formData.defendant_type} onChange={handleChange}>
            <option value="">Select...</option>
            <option value="Individual">Individual</option>
            <option value="Corporation">Corporation</option>
            <option value="Government">Government</option>
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Coverage (Legacy)</label>
        <input
          type="text"
          name="coverage"
          value={formData.coverage}
          onChange={handleChange}
          placeholder="Optional: General coverage description"
        />
      </div>

      <h4>Insurance Coverage</h4>
      
      <fieldset className="insurance-section">
        <legend>Primary Insurance Coverage</legend>
        <div className="form-row">
          <div className="form-group">
            <label>Coverage Limit ($)</label>
            <input
              type="number"
              name="primary_coverage_limit"
              value={formData.primary_coverage_limit}
              onChange={handleChange}
              min="0"
              step="10000"
              placeholder="e.g., 250000"
            />
          </div>
          <div className="form-group">
            <label>Insurance Company</label>
            <input
              type="text"
              name="primary_insurer_name"
              value={formData.primary_insurer_name}
              onChange={handleChange}
              placeholder="e.g., State Farm"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Adjuster Name</label>
            <input
              type="text"
              name="primary_adjuster_name"
              value={formData.primary_adjuster_name}
              onChange={handleChange}
              placeholder="e.g., John Smith"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="insurance-section">
        <legend>Umbrella / Excess Coverage</legend>
        <div className="form-row">
          <div className="form-group">
            <label>Coverage Limit ($)</label>
            <input
              type="number"
              name="umbrella_coverage_limit"
              value={formData.umbrella_coverage_limit}
              onChange={handleChange}
              min="0"
              step="10000"
              placeholder="e.g., 1000000"
            />
          </div>
          <div className="form-group">
            <label>Insurance Company</label>
            <input
              type="text"
              name="umbrella_insurer_name"
              value={formData.umbrella_insurer_name}
              onChange={handleChange}
              placeholder="e.g., Liberty Mutual"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Adjuster Name</label>
            <input
              type="text"
              name="umbrella_adjuster_name"
              value={formData.umbrella_adjuster_name}
              onChange={handleChange}
              placeholder="e.g., Jane Doe"
            />
          </div>
        </div>
      </fieldset>

      <fieldset className="insurance-section">
        <legend>UM/UIM Coverage</legend>
        <div className="form-row">
          <div className="form-group">
            <label>Coverage Limit ($)</label>
            <input
              type="number"
              name="uim_coverage_limit"
              value={formData.uim_coverage_limit}
              onChange={handleChange}
              min="0"
              step="10000"
              placeholder="e.g., 100000"
            />
          </div>
          <div className="form-group">
            <label>Insurance Company</label>
            <input
              type="text"
              name="uim_insurer_name"
              value={formData.uim_insurer_name}
              onChange={handleChange}
              placeholder="e.g., Plaintiff's Carrier"
            />
          </div>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Adjuster Name</label>
            <input
              type="text"
              name="uim_adjuster_name"
              value={formData.uim_adjuster_name}
              onChange={handleChange}
              placeholder="e.g., Bob Johnson"
            />
          </div>
        </div>
      </fieldset>

      <div className="form-group">
        <label>Injury Description</label>
        <textarea
          name="injury_description"
          value={formData.injury_description}
          onChange={handleChange}
          rows="3"
        />
      </div>

      <h4>Damages</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Past Medical Bills ($)</label>
          <input
            type="number"
            name="past_medical_bills"
            value={formData.past_medical_bills}
            onChange={handleChange}
            min="0"
            step="100"
          />
        </div>
        <div className="form-group">
          <label>Future Medical Bills ($)</label>
          <input
            type="number"
            name="future_medical_bills"
            value={formData.future_medical_bills}
            onChange={handleChange}
            min="0"
            step="100"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Loss of Earning Capacity ($)</label>
          <input
            type="number"
            name="lcp"
            value={formData.lcp}
            onChange={handleChange}
            min="0"
            step="100"
          />
        </div>
        <div className="form-group">
          <label>Lost Wages ($)</label>
          <input
            type="number"
            name="lost_wages"
            value={formData.lost_wages}
            onChange={handleChange}
            min="0"
            step="100"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Loss Earning Capacity ($)</label>
          <input
            type="number"
            name="loss_earning_capacity"
            value={formData.loss_earning_capacity}
            onChange={handleChange}
            min="0"
            step="100"
          />
        </div>
      </div>

      <h4>Negotiation Strategy</h4>
      <div className="form-row">
        <div className="form-group">
          <label>Settlement Goal ($)</label>
          <input
            type="number"
            name="settlement_goal"
            value={formData.settlement_goal}
            onChange={handleChange}
            min="0"
            step="1000"
            placeholder="Optional target settlement amount"
          />
        </div>
      </div>

      <div className="form-group">
        <label>Case Notes</label>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          rows="3"
          placeholder="Add any additional notes about this negotiation"
        />
      </div>

      <button type="submit" className="btn btn-primary">Create Negotiation</button>
    </form>
  );
}

export default NegotiationForm;
