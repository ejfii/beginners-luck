import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BracketProposals from '../components/BracketProposals';

// Mock axios before importing it
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

const axios = require('axios');

describe('BracketProposals', () => {
  const mockToken = 'fake-token';
  const mockNegotiationId = 1;

  const mockBrackets = [
    {
      id: 1,
      plaintiff_amount: 2000000,
      defendant_amount: 750000,
      status: 'active',
      notes: 'Opening bracket',
      created_at: '2025-12-01T00:00:00.000Z'
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock for GET request
    axios.get.mockResolvedValue({ data: mockBrackets });
  });

  test('fetches and displays existing brackets', async () => {
    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/brackets`),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
    });

    // Check if bracket amounts are displayed
    await waitFor(() => {
      expect(screen.getByText(/\$2,000,000/)).toBeInTheDocument();
      expect(screen.getByText(/\$750,000/)).toBeInTheDocument();
    });
  });

  test('shows form when "new bracket" button is clicked', async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Form fields should appear - check for text inputs (plaintiff_amount, defendant_amount)
    const plaintiffInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantInput = screen.getByLabelText(/defendant amount/i);
    expect(plaintiffInput).toBeInTheDocument();
    expect(defendantInput).toBeInTheDocument();
  test('shows validation error for invalid plaintiff amount', async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Fill invalid plaintiff amount (negative or non-numeric)
    const plaintiffAmountInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantAmountInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.type(plaintiffAmountInput, '-100000'); // Invalid: negative
    fireEvent.blur(plaintiffAmountInput);
    await userEvent.type(defendantAmountInput, '750000');
    fireEvent.blur(defendantAmountInput);

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/plaintiff amount must be a valid positive number/i)).toBeInTheDocument();
    });

    expect(axios.post).not.toHaveBeenCalled();
  });
    expect(axios.post).not.toHaveBeenCalled();
  });
  test('shows validation error for invalid defendant amount', async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Fill invalid defendant amount
    const plaintiffAmountInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantAmountInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.type(plaintiffAmountInput, '2000000');
    fireEvent.blur(plaintiffAmountInput);
    await userEvent.type(defendantAmountInput, '-50000'); // Invalid: negative
    fireEvent.blur(defendantAmountInput);

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/defendant amount must be a valid positive number/i)).toBeInTheDocument();
    });

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('successfully submits a valid bracket', async () => {
    const newBracket = {
      id: 2,
      plaintiff_amount: 2000000,
      defendant_amount: 750000,
      status: 'active',
      proposed_by: 'plaintiff',
      notes: 'Test bracket',
      created_at: '2025-12-07T00:00:00.000Z'
    };

    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: newBracket });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Fill valid bracket data
    const plaintiffAmountInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantAmountInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.type(plaintiffAmountInput, '2000000');
    fireEvent.blur(plaintiffAmountInput);
    await userEvent.type(defendantAmountInput, '750000');
    fireEvent.blur(defendantAmountInput);

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/brackets`),
        expect.objectContaining({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          proposed_by: 'plaintiff'
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
    });

    // Form should close after successful submission
    await waitFor(() => {
      expect(screen.queryByLabelText(/plaintiff amount/i)).not.toBeInTheDocument();
    });
  });

  test('displays the new bracket in the list after submission', async () => {
    const newBracket = {
      id: 2,
      plaintiff_amount: 2000000,
      defendant_amount: 750000,
      status: 'active',
      notes: 'Test bracket',
      created_at: '2025-12-07T00:00:00.000Z'
    };

    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: newBracket });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form and submit valid bracket
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    const inputs = screen.getAllByRole('spinbutton');
    const plaintiffAmountInput = inputs[0];
    const defendantAmountInput = inputs[1];

    await userEvent.type(plaintiffAmountInput, '2000000');
    await userEvent.type(defendantAmountInput, '750000');

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });

    // The new bracket should appear in the list
    await waitFor(() => {
      expect(screen.getByText(/\$2,000,000/)).toBeInTheDocument();
      expect(screen.getByText(/\$750,000/)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockRejectedValue({
      response: { data: { error: 'Failed to create bracket' } }
    });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form and submit
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    const plaintiffAmountInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantAmountInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.type(plaintiffAmountInput, '2000000');
    fireEvent.blur(plaintiffAmountInput);
    await userEvent.type(defendantAmountInput, '750000');
    fireEvent.blur(defendantAmountInput);

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/failed to create bracket/i)).toBeInTheDocument();
    });
  });

  test('allows updating bracket status', async () => {
    axios.get.mockResolvedValue({ data: mockBrackets });
    axios.put.mockResolvedValue({ data: { message: 'Bracket updated' } });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$2,000,000/)).toBeInTheDocument();
    });

    // Find and click a status change button (e.g., Accept or Reject)
    const acceptButton = screen.getByRole('button', { name: /accept/i });
    fireEvent.click(acceptButton);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining('/brackets/1'),
        expect.objectContaining({ status: 'accepted' }),
        expect.any(Object)
      );
    });
  });

  // Tests for proposed_by functionality
  test('shows radio buttons to select proposer (plaintiff or defendant)', async () => {
    axios.get.mockResolvedValue({ data: [] });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Check for proposer radio buttons
    const plaintiffRadio = screen.getByRole('radio', { name: /plaintiff/i });
    const defendantRadio = screen.getByRole('radio', { name: /defendant/i });

    expect(plaintiffRadio).toBeInTheDocument();
    expect(defendantRadio).toBeInTheDocument();
    expect(plaintiffRadio).toBeChecked(); // Default should be plaintiff
  });

  test('submits bracket with proposed_by plaintiff when plaintiff radio is selected', async () => {
    const newBracket = {
      id: 2,
      plaintiff_amount: 2000000,
      defendant_amount: 750000,
      status: 'active',
      proposed_by: 'plaintiff',
      created_at: '2025-12-07T00:00:00.000Z'
    };

    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: newBracket });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Plaintiff should be selected by default, but let's explicitly select it
    const plaintiffRadio = screen.getByRole('radio', { name: /plaintiff/i });
    fireEvent.click(plaintiffRadio);

    // Fill in amounts using text inputs (since we switched to text inputs with money parsing)
    const plaintiffInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.clear(plaintiffInput);
    await userEvent.type(plaintiffInput, '2000000');
    fireEvent.blur(plaintiffInput); // Trigger parsing
    await userEvent.clear(defendantInput);
    await userEvent.type(defendantInput, '750000');
    fireEvent.blur(defendantInput); // Trigger parsing

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/brackets`),
        expect.objectContaining({
          plaintiff_amount: 2000000,
          defendant_amount: 750000,
          proposed_by: 'plaintiff'
        }),
        expect.any(Object)
      );
    });
  });

  test('submits bracket with proposed_by defendant when defendant radio is selected', async () => {
    const newBracket = {
      id: 3,
      plaintiff_amount: 1800000,
      defendant_amount: 800000,
      status: 'active',
      proposed_by: 'defendant',
      created_at: '2025-12-07T00:00:00.000Z'
    };

    axios.get.mockResolvedValue({ data: [] });
    axios.post.mockResolvedValue({ data: newBracket });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Select defendant radio
    const defendantRadio = screen.getByRole('radio', { name: /defendant/i });
    fireEvent.click(defendantRadio);

    // Fill in amounts
    const plaintiffInput = screen.getByLabelText(/plaintiff amount/i);
    const defendantInput = screen.getByLabelText(/defendant amount/i);

    await userEvent.clear(plaintiffInput);
    await userEvent.type(plaintiffInput, '1800000');
    fireEvent.blur(plaintiffInput); // Trigger parsing
    await userEvent.clear(defendantInput);
    await userEvent.type(defendantInput, '800000');
    fireEvent.blur(defendantInput); // Trigger parsing

    const submitButton = screen.getByRole('button', { name: /create bracket/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/brackets`),
        expect.objectContaining({
          plaintiff_amount: 1800000,
          defendant_amount: 800000,
          proposed_by: 'defendant'
        }),
        expect.any(Object)
      );
    });
  });

  test('displays proposer badge for plaintiff brackets', async () => {
    const plaintiffBrackets = [
      {
        id: 1,
        plaintiff_amount: 2000000,
        defendant_amount: 750000,
        status: 'active',
        proposed_by: 'plaintiff',
        created_at: '2025-12-01T00:00:00.000Z'
      }
    ];

    axios.get.mockResolvedValue({ data: plaintiffBrackets });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/plaintiff bracket/i)).toBeInTheDocument();
    });
  });

  test('displays proposer badge for defendant brackets', async () => {
    const defendantBrackets = [
      {
        id: 2,
        plaintiff_amount: 1800000,
        defendant_amount: 800000,
        status: 'active',
        proposed_by: 'defendant',
        created_at: '2025-12-02T00:00:00.000Z'
      }
    ];

    axios.get.mockResolvedValue({ data: defendantBrackets });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/defendant bracket/i)).toBeInTheDocument();
    });
  });

  test('defaults proposer to opposite side of last bracket', async () => {
    const existingBrackets = [
      {
        id: 1,
        plaintiff_amount: 2000000,
        defendant_amount: 750000,
        status: 'active',
        proposed_by: 'plaintiff',
        created_at: '2025-12-01T00:00:00.000Z'
      }
    ];

    axios.get.mockResolvedValue({ data: existingBrackets });

    render(<BracketProposals negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$2,000,000/)).toBeInTheDocument();
    });

    // Open form
    const newBracketButton = screen.getByRole('button', { name: /new bracket/i });
    fireEvent.click(newBracketButton);

    // Since last bracket was plaintiff-proposed, defendant should be default
    const defendantRadio = screen.getByRole('radio', { name: /defendant/i });
    expect(defendantRadio).toBeChecked();
  });
});
