import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NegotiationDetail from '../components/NegotiationDetail';

// Mock child components
jest.mock('../components/MoveTracker', () => {
  return function MockMoveTracker() {
    return <div data-testid="move-tracker">Move Tracker</div>;
  };
});

jest.mock('../components/AnalyticsDashboard', () => {
  return function MockAnalyticsDashboard() {
    return <div data-testid="analytics-dashboard">Analytics Dashboard</div>;
  };
});

jest.mock('../components/PdfExport', () => {
  return function MockPdfExport() {
    return <div data-testid="pdf-export">PDF Export</div>;
  };
});

jest.mock('../components/Toast', () => {
  return function MockToast({ visible, message }) {
    return visible ? <div data-testid="toast">{message}</div> : null;
  };
});

jest.mock('../components/BracketProposals', () => {
  return function MockBracketProposals() {
    return <div data-testid="bracket-proposals">Bracket Proposals</div>;
  };
});

jest.mock('../components/MediatorProposal', () => {
  return function MockMediatorProposal() {
    return <div data-testid="mediator-proposal">Mediator Proposal</div>;
  };
});

describe('NegotiationDetail', () => {
  const mockNegotiation = {
    id: 1,
    name: 'Smith v. Jones',
    plaintiff_attorney: 'John Doe',
    defendant_attorney: 'Jane Smith',
    mediator: 'Judge Brown',
    venue: 'Superior Court',
    status: 'active',
    past_medical_bills: 50000,
    future_medical_bills: 25000,
    settlement_goal: 100000,
    notes: 'Initial case notes',
    moves: [],
    analytics: {
      midpoint: 75000,
      momentum: 0.5,
      predicted_settlement: 85000
    }
  };

  const mockOnUpdate = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnRefresh = jest.fn();
  const mockToken = 'fake-token';

  beforeEach(() => {
    mockOnUpdate.mockClear();
    mockOnDelete.mockClear();
    mockOnRefresh.mockClear();
  });

  test('renders key sections: moves, brackets, mediator proposal', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    expect(screen.getByTestId('move-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('bracket-proposals')).toBeInTheDocument();
    expect(screen.getByTestId('mediator-proposal')).toBeInTheDocument();
  });

  test('displays case name and status', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    expect(screen.getByText('Smith v. Jones')).toBeInTheDocument();
    // Status should be displayed somewhere
    expect(screen.getByText(/active/i)).toBeInTheDocument();
  });

  test('enters edit mode when edit button is clicked', async () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Should show save and cancel buttons in edit mode
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
  });

  test('calls onUpdate when case details are saved', async () => {
    mockOnUpdate.mockResolvedValue({});

    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    });

    // Modify a field (find by label or placeholder)
    const plaintiffInput = screen.getByDisplayValue('John Doe');
    await userEvent.clear(plaintiffInput);
    await userEvent.type(plaintiffInput, 'John Smith Updated');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          plaintiff_attorney: 'John Smith Updated'
        })
      );
    });
  });

  test('cancels edit mode without saving changes', async () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    // Cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    // Should exit edit mode
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /save/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /edit/i })).toBeInTheDocument();
    });

    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  test('calls onDelete when delete button is clicked and confirmed', async () => {
    // Mock window.confirm to return true
    global.confirm = jest.fn(() => true);

    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /close case/i });
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(mockOnDelete).toHaveBeenCalledWith(1, mockNegotiation.name);
    });
  });

  test('calls onDelete when delete button is clicked', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const deleteButton = screen.getByRole('button', { name: /close case/i });
    fireEvent.click(deleteButton);

    expect(mockOnDelete).toHaveBeenCalledWith(mockNegotiation.id, mockNegotiation.name);
  });

  test('updates when negotiation prop changes', () => {
    const { rerender } = render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    expect(screen.getByText('Smith v. Jones')).toBeInTheDocument();

    // Update the negotiation
    const updatedNegotiation = {
      ...mockNegotiation,
      name: 'Updated Case Name'
    };

    rerender(
      <NegotiationDetail
        negotiation={updatedNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    expect(screen.getByText('Updated Case Name')).toBeInTheDocument();
  });

  test('edit mode includes all insurance coverage fields', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Verify primary coverage fields
    expect(screen.getByLabelText('Primary Coverage Limit ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary Insurer Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary Adjuster')).toBeInTheDocument();

    // Verify umbrella coverage fields
    expect(screen.getByLabelText('Umbrella Coverage Limit ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Umbrella Insurer Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Umbrella Adjuster')).toBeInTheDocument();

    // Verify UM/UIM coverage fields
    expect(screen.getByLabelText('UM/UIM Coverage Limit ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('UM/UIM Insurer Name')).toBeInTheDocument();
    expect(screen.getByLabelText('UM/UIM Adjuster')).toBeInTheDocument();
  });

  test('edit mode includes all damages fields', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Verify all damages fields
    expect(screen.getByLabelText('Past Medical Bills ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Future Medical Bills ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Life Care Plan ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Lost Wages ($)')).toBeInTheDocument();
    expect(screen.getByLabelText('Loss Earning Capacity ($)')).toBeInTheDocument();
  });

  test('edit mode includes case detail fields', () => {
    render(
      <NegotiationDetail
        negotiation={mockNegotiation}
        onUpdate={mockOnUpdate}
        onDelete={mockOnDelete}
        onRefresh={mockOnRefresh}
        onOpenMediationView={jest.fn()}
        token={mockToken}
      />
    );

    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);

    // Verify case detail fields
    expect(screen.getByLabelText('Defendant Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Coverage (Legacy)')).toBeInTheDocument();
    expect(screen.getByLabelText('Injury Description')).toBeInTheDocument();
  });
});
