import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MediatorProposal from '../components/MediatorProposal';

// Mock axios before importing it
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
}));

const axios = require('axios');

describe('MediatorProposal', () => {
  const mockToken = 'fake-token';
  const mockNegotiationId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    // Use real timers by default - individual tests can enable fake timers if needed
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('renders no proposal message when proposal is null', async () => {
    axios.get.mockResolvedValue({ data: null });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/mediator-proposal`),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
      expect(screen.getByText(/No mediator proposal yet/i)).toBeInTheDocument();
    });
  });

  test('renders existing mediator proposal with amount and status', async () => {
    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null,
      notes: 'Settlement proposal'
    };

    axios.get.mockResolvedValue({ data: mockProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$95,000/)).toBeInTheDocument();
      // Check for status badge with pending class
      const statusBadges = screen.getAllByText(/pending/i);
      expect(statusBadges.length).toBeGreaterThan(0);
    });
  });

  test('displays countdown timer for pending proposal', async () => {
    jest.useFakeTimers();
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2); // 2 days in future

    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: futureDate.toISOString(),
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null
    };

    axios.get.mockResolvedValue({ data: mockProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$95,000/)).toBeInTheDocument();
    }, { timeout: 3000 });

    // Advance timers to trigger countdown update
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Should show countdown
    await waitFor(() => {
      expect(screen.getByText(/\d+d \d+h \d+m/)).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('shows form when "Create Proposal" button is clicked', async () => {
    axios.get.mockResolvedValue({ data: null });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/No mediator proposal yet/i)).toBeInTheDocument();
    });

    const createButton = screen.getByRole('button', { name: /create proposal/i });
    
    // Click button within act to ensure state updates are flushed
    act(() => {
      fireEvent.click(createButton);
    });

    // Form fields should appear - check for Cancel button to confirm form is showing
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });
    
    expect(screen.getByPlaceholderText(/enter proposed settlement amount/i)).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toBeInTheDocument();
  });

  test('validates that deadline must be in the future', async () => {
    axios.get.mockResolvedValue({ data: null });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/No mediator proposal yet/i)).toBeInTheDocument();
    });

    // Open form
    const createButton = screen.getByRole('button', { name: /create proposal/i });
    act(() => {
      fireEvent.click(createButton);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText(/enter proposed settlement amount/i);
    const form = amountInput.closest('form');
    const deadlineInput = form.querySelector('input[type="datetime-local"]');

    fireEvent.change(amountInput, { target: { value: '95000' } });
    
    // Set deadline to yesterday (datetime-local format)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 16);
    
    fireEvent.change(deadlineInput, { target: { value: yesterdayStr } });

    const submitButton = screen.getByRole('button', { name: /create proposal/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/deadline must be in the future/i)).toBeInTheDocument();
    });

    expect(axios.post).not.toHaveBeenCalled();
  });

  test('successfully submits a valid proposal with future deadline', async () => {
    const newProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null
    };

    axios.get.mockResolvedValue({ data: null });
    axios.post.mockResolvedValue({ data: newProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/No mediator proposal yet/i)).toBeInTheDocument();
    });

    // Open form
    const createButton = screen.getByRole('button', { name: /create proposal/i });
    act(() => {
      fireEvent.click(createButton);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText(/enter proposed settlement amount/i);
    const form = amountInput.closest('form');
    const deadlineInput = form.querySelector('input[type="datetime-local"]');

    // Set future deadline (datetime-local format: YYYY-MM-DDTHH:MM)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:MM
    
    // Update form inputs using fireEvent.change for controlled components
    fireEvent.change(amountInput, { target: { value: '95000' } });
    fireEvent.change(deadlineInput, { target: { value: futureDateStr } });

    // Submit the form
    fireEvent.submit(form);

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/mediator-proposal`),
        expect.objectContaining({
          amount: '95000',
          deadline: expect.stringContaining(futureDateStr)
        }),
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
    });

    // Proposal should be displayed after submission
    await waitFor(() => {
      expect(screen.getByText(/\$95,000/)).toBeInTheDocument();
    });
  });

  test('allows plaintiff to accept proposal', async () => {
    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null
    };

    const updatedProposal = {
      ...mockProposal,
      plaintiff_response: 'accepted',
      status: 'accepted_plaintiff'
    };

    axios.get.mockResolvedValue({ data: mockProposal });
    axios.put.mockResolvedValue({ data: updatedProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$95,000/)).toBeInTheDocument();
    });

    // Find and click plaintiff accept button (first Accept button)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    fireEvent.click(acceptButtons[0]); // First Accept button is for plaintiff

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/mediator-proposal`),
        { party: 'plaintiff', response: 'accepted' },
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
    });
  });

  test('allows defendant to accept proposal', async () => {
    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null
    };

    const updatedProposal = {
      ...mockProposal,
      defendant_response: 'accepted',
      status: 'accepted_defendant'
    };

    axios.get.mockResolvedValue({ data: mockProposal });
    axios.put.mockResolvedValue({ data: updatedProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/\$95,000/)).toBeInTheDocument();
    });

    // Find and click defendant accept button (second Accept button)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    fireEvent.click(acceptButtons[1]); // Second Accept button is for defendant

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalledWith(
        expect.stringContaining(`/negotiations/${mockNegotiationId}/mediator-proposal`),
        { party: 'defendant', response: 'accepted' },
        expect.objectContaining({
          headers: { Authorization: `Bearer ${mockToken}` }
        })
      );
    });
  });

  test('updates displayed status after party response', async () => {
    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'pending',
      plaintiff_response: null,
      defendant_response: null
    };

    const updatedProposal = {
      ...mockProposal,
      plaintiff_response: 'accepted',
      status: 'accepted_plaintiff'
    };

    axios.get
      .mockResolvedValueOnce({ data: mockProposal })
      .mockResolvedValueOnce({ data: updatedProposal });
    
    axios.put.mockResolvedValue({ data: updatedProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      const pendingElements = screen.getAllByText(/pending/i);
      expect(pendingElements.length).toBeGreaterThan(0);
    });

    // Accept as plaintiff (first Accept button)
    const acceptButtons = screen.getAllByRole('button', { name: /accept/i });
    fireEvent.click(acceptButtons[0]);

    await waitFor(() => {
      expect(axios.put).toHaveBeenCalled();
    });

    // Status should update
    await waitFor(() => {
      expect(screen.getByText(/plaintiff accepted/i)).toBeInTheDocument();
    });
  });

  test('shows both accepted status when both parties accept', async () => {
    const mockProposal = {
      id: 1,
      amount: 95000,
      deadline: '2025-12-15T00:00:00.000Z',
      status: 'accepted_both',
      plaintiff_response: 'accepted',
      defendant_response: 'accepted'
    };

    axios.get.mockResolvedValue({ data: mockProposal });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/both accepted/i)).toBeInTheDocument();
    });
  });

  test('handles API errors when fetching proposal', async () => {
    axios.get.mockRejectedValue({
      response: { data: { error: 'Failed to fetch proposal' } }
    });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    await waitFor(() => {
      expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
    });
  });

  test('handles API errors when submitting proposal', async () => {
    axios.get.mockResolvedValue({ data: null });
    axios.post.mockRejectedValue({
      response: { data: { error: 'Failed to create proposal' } }
    });

    render(<MediatorProposal negotiationId={mockNegotiationId} token={mockToken} />);

    // Wait for component to finish loading
    await waitFor(() => {
      expect(screen.getByText(/No mediator proposal yet/i)).toBeInTheDocument();
    });

    // Open form
    const createButton = screen.getByRole('button', { name: /create proposal/i });
    act(() => {
      fireEvent.click(createButton);
    });

    // Wait for form to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    });

    const amountInput = screen.getByPlaceholderText(/enter proposed settlement amount/i);
    const form = amountInput.closest('form');
    const deadlineInput = form.querySelector('input[type="datetime-local"]');
    
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    const futureDateStr = futureDate.toISOString().slice(0, 16);
    
    // Update form inputs using fireEvent.change for controlled components
    fireEvent.change(amountInput, { target: { value: '95000' } });
    fireEvent.change(deadlineInput, { target: { value: futureDateStr } });

    // Submit the form
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText(/failed to create proposal/i)).toBeInTheDocument();
    });
  });
});
