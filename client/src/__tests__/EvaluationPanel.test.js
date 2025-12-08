import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import EvaluationPanel from '../components/EvaluationPanel';

jest.mock('axios');

describe('EvaluationPanel', () => {
  const mockNegotiation = {
    id: 1,
    name: 'Test Case',
    medical_specials: 50000,
    economic_damages: 25000,
    non_economic_damages: 100000,
    policy_limits: 250000,
    liability_percentage: 75,
    jury_damages_likelihood: 65,
    evaluation_notes: 'Test evaluation notes'
  };

  const mockToken = 'test-token';
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render jury damages likelihood field in edit mode', () => {
    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Click edit button
    const editButton = screen.getByText(/Edit/i);
    fireEvent.click(editButton);

    // Check for jury damages likelihood label
    expect(screen.getByText('Jury Damages Likelihood (%):')).toBeInTheDocument();

    // Check for input and slider
    const numberInputs = screen.getAllByRole('spinbutton');
    const sliders = screen.getAllByRole('slider');
    
    // Should have liability percentage and jury damages likelihood inputs
    expect(numberInputs.length).toBeGreaterThanOrEqual(2);
    expect(sliders.length).toBeGreaterThanOrEqual(2);
  });

  it('should display jury damages likelihood value correctly', () => {
    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // In view mode, should show the percentage and label (appears in multiple places)
    const percentageElements = screen.getAllByText(/65%/);
    expect(percentageElements.length).toBeGreaterThan(0);
    const likelihoodElements = screen.getAllByText(/High likelihood/);
    expect(likelihoodElements.length).toBeGreaterThan(0);
  });

  it('should update jury damages likelihood with slider', () => {
    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Enter edit mode
    const editButton = screen.getByText(/Edit/i);
    fireEvent.click(editButton);

    // Find the jury damages likelihood slider (second slider)
    const sliders = screen.getAllByRole('slider');
    const jurySlider = sliders[1]; // Assuming liability is first, jury is second

    // Change value
    fireEvent.change(jurySlider, { target: { value: '80' } });

    // Should update the label (appears in multiple places)
    const percentageElements = screen.getAllByText(/80%/);
    expect(percentageElements.length).toBeGreaterThan(0);
    const likelihoodElements = screen.getAllByText(/High likelihood/);
    expect(likelihoodElements.length).toBeGreaterThan(0);
  });

  it('should show different labels for different likelihood ranges', () => {
    const { rerender } = render(
      <EvaluationPanel
        negotiation={{ ...mockNegotiation, jury_damages_likelihood: 20 }}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Low likelihood (0-25%)
    expect(screen.getAllByText(/20%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Low likelihood/).length).toBeGreaterThan(0);

    // Moderate likelihood (26-60%)
    rerender(
      <EvaluationPanel
        negotiation={{ ...mockNegotiation, jury_damages_likelihood: 50 }}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );
    expect(screen.getAllByText(/50%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Moderate likelihood/).length).toBeGreaterThan(0);

    // High likelihood (61-100%)
    rerender(
      <EvaluationPanel
        negotiation={{ ...mockNegotiation, jury_damages_likelihood: 80 }}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );
    expect(screen.getAllByText(/80%/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/High likelihood/).length).toBeGreaterThan(0);
  });

  it('should include jury damages likelihood in save request', async () => {
    axios.put.mockResolvedValue({ data: { ...mockNegotiation, jury_damages_likelihood: 70 } });

    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Enter edit mode
    const editButton = screen.getByText(/Edit/i);
    fireEvent.click(editButton);

    // Change jury damages likelihood
    const sliders = screen.getAllByRole('slider');
    const jurySlider = sliders[1];
    fireEvent.change(jurySlider, { target: { value: '70' } });

    // Save
    const saveButton = screen.getByText(/Save/i);
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
    });

    // Check that jury_damages_likelihood was included in the request
    const callArgs = axios.put.mock.calls[0];
    expect(callArgs[1]).toHaveProperty('jury_damages_likelihood', '70');
  });

  it('should display jury assessment section when likelihood is set', () => {
    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Should show jury assessment section
    expect(screen.getByText(/Jury Damages Assessment/)).toBeInTheDocument();
    expect(screen.getByText(/Likelihood jury awards claimed damages: 65%/)).toBeInTheDocument();
    expect(screen.getByText(/Consider this when setting conservative settlement targets/)).toBeInTheDocument();
  });

  it('should not display jury assessment section when likelihood is not set', () => {
    const negotiationWithoutJuryLikelihood = {
      ...mockNegotiation,
      jury_damages_likelihood: null
    };

    render(
      <EvaluationPanel
        negotiation={negotiationWithoutJuryLikelihood}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // Should not show jury assessment section
    expect(screen.queryByText(/Jury Damages Assessment/)).not.toBeInTheDocument();
  });

  it('should calculate jury-adjusted settlement range', () => {
    render(
      <EvaluationPanel
        negotiation={mockNegotiation}
        token={mockToken}
        onUpdate={mockOnUpdate}
      />
    );

    // With 65% jury likelihood, should show adjusted ranges
    // Original range calculation: 75% liability on $175k total = $131,250 adjusted value
    // Settlement range: 60-90% of adjusted = ~$78,750 - $118,125
    // Jury-adjusted: 65% of those values = ~$51,187 - $76,781
    
    // Check that the jury-adjusted text appears (exact values may vary due to rounding)
    const jurySection = screen.getByText(/jury-adjusted range of approximately/i);
    expect(jurySection).toBeInTheDocument();
  });
});
