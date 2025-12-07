import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NegotiationForm from '../components/NegotiationForm';

describe('NegotiationForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  test('renders all required fields', () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Check for key input fields by name attribute (inputs don't have accessible names)
    expect(container.querySelector('input[name="name"]')).toBeInTheDocument();
    expect(screen.getByText(/plaintiffs/i)).toBeInTheDocument();
    expect(screen.getByText(/defendants/i)).toBeInTheDocument();
    expect(container.querySelector('input[name="mediator"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="venue"]')).toBeInTheDocument();
    
    // Check for submit button
    expect(screen.getByRole('button', { name: /create negotiation/i })).toBeInTheDocument();
  });

  test('shows validation error when case name is empty', async () => {
    render(<NegotiationForm onSubmit={mockOnSubmit} />);

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/case name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('shows validation error when plaintiff name is empty', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Fill case name but leave plaintiff name empty
    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Test Case');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/at least one plaintiff name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  test('does not show validation error when case name and plaintiff are provided', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Smith v. Jones');

    // Fill in plaintiff name (first party input)
    const plaintiffInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffInputs[0], 'John Doe');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/case name is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/at least one plaintiff name is required/i)).not.toBeInTheDocument();
    });

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
  });

  test('calls onSubmit with form data when valid form is submitted', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Fill in required field
    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Smith v. Jones');

    // Fill in plaintiff name (required)
    const plaintiffNameInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffNameInputs[0], 'John Plaintiff');

    // Fill in defendant name (optional)
    const defendantNameInputs = screen.getAllByPlaceholderText(/ABC Corporation/i);
    await userEvent.type(defendantNameInputs[0], 'ABC Corp');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Smith v. Jones');
    expect(submittedData.parties).toBeDefined();
    expect(submittedData.parties.length).toBe(2);
    expect(submittedData.parties[0].party_name).toBe('John Plaintiff');
    expect(submittedData.parties[0].role).toBe('plaintiff');
    expect(submittedData.parties[1].party_name).toBe('ABC Corp');
    expect(submittedData.parties[1].role).toBe('defendant');
  });

  test('clears form after successful submission', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Smith v. Jones');

    // Fill in plaintiff name (required)
    const plaintiffNameInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffNameInputs[0], 'John Plaintiff');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Form should be cleared
    expect(caseNameInput).toHaveValue('');
  });

  test('handles numeric fields correctly', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Test Case');

    // Fill in plaintiff name (required)
    const plaintiffNameInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffNameInputs[0], 'John Plaintiff');

    // Find and fill numeric field
    const pastMedicalBillsInput = container.querySelector('input[name="past_medical_bills"]');
    await userEvent.clear(pastMedicalBillsInput);
    await userEvent.type(pastMedicalBillsInput, '50000');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.past_medical_bills).toBe(50000);
  });

  test('clears validation errors when user starts typing', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Submit empty form to trigger validation
    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/case name is required/i)).toBeInTheDocument();
    });

    // Start typing - error should remain until next submit attempt
    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Test');

    // Fill in plaintiff name
    const plaintiffNameInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffNameInputs[0], 'John Plaintiff');

    // Submit again - error should be gone
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText(/case name is required/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/at least one plaintiff name is required/i)).not.toBeInTheDocument();
    });
  });

  test('renders insurance coverage fields', () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Check for primary insurance fields
    expect(container.querySelector('input[name="primary_coverage_limit"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="primary_insurer_name"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="primary_adjuster_name"]')).toBeInTheDocument();

    // Check for umbrella insurance fields
    expect(container.querySelector('input[name="umbrella_coverage_limit"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="umbrella_insurer_name"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="umbrella_adjuster_name"]')).toBeInTheDocument();

    // Check for UM/UIM insurance fields
    expect(container.querySelector('input[name="uim_coverage_limit"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="uim_insurer_name"]')).toBeInTheDocument();
    expect(container.querySelector('input[name="uim_adjuster_name"]')).toBeInTheDocument();
  });

  test('submits insurance coverage data correctly', async () => {
    const { container } = render(<NegotiationForm onSubmit={mockOnSubmit} />);

    // Fill in required field
    const caseNameInput = container.querySelector('input[name="name"]');
    await userEvent.type(caseNameInput, 'Insurance Test Case');

    // Fill in plaintiff name (required)
    const plaintiffNameInputs = screen.getAllByPlaceholderText(/John Doe/i);
    await userEvent.type(plaintiffNameInputs[0], 'John Plaintiff');

    // Fill in insurance fields
    const primaryLimitInput = container.querySelector('input[name="primary_coverage_limit"]');
    await userEvent.type(primaryLimitInput, '250000');

    const primaryInsurerInput = container.querySelector('input[name="primary_insurer_name"]');
    await userEvent.type(primaryInsurerInput, 'State Farm');

    const primaryAdjusterInput = container.querySelector('input[name="primary_adjuster_name"]');
    await userEvent.type(primaryAdjusterInput, 'John Adjuster');

    const umbrellaLimitInput = container.querySelector('input[name="umbrella_coverage_limit"]');
    await userEvent.type(umbrellaLimitInput, '1000000');

    const submitButton = screen.getByRole('button', { name: /create negotiation/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const submittedData = mockOnSubmit.mock.calls[0][0];
    expect(submittedData.name).toBe('Insurance Test Case');
    expect(submittedData.primary_coverage_limit).toBe(250000);
    expect(submittedData.primary_insurer_name).toBe('State Farm');
    expect(submittedData.primary_adjuster_name).toBe('John Adjuster');
    expect(submittedData.umbrella_coverage_limit).toBe(1000000);
  });
});
