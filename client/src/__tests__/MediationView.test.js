import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import axios from 'axios';
import MediationView from '../components/MediationView';

jest.mock('axios');

describe('MediationView', () => {
  const mockNegotiation = {
    id: 1,
    name: 'Test Case v. Defendant',
    status: 'active',
    created_date: '2025-01-01T00:00:00Z',
    venue: 'Superior Court',
    mediator: 'Judge Smith',
    judge: 'Hon. Johnson',
    defendant_type: 'Corporation',
    parties: [
      {
        id: 1,
        role: 'plaintiff',
        party_name: 'John Doe',
        attorney_name: 'Jane Smith',
        law_firm_name: 'Smith & Associates'
      },
      {
        id: 2,
        role: 'defendant',
        party_name: 'ABC Corporation',
        attorney_name: 'Bob Johnson',
        law_firm_name: 'Johnson Law Firm'
      }
    ]
  };

  const mockToken = 'test-token';
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render parties section with attorney information', async () => {
    // Mock API responses
    axios.get.mockImplementation((url) => {
      if (url.includes('/negotiations/')) {
        return Promise.resolve({ data: mockNegotiation });
      }
      if (url.includes('/moves/')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/brackets')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/mediator-proposal')) {
        return Promise.resolve({ data: null });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <MediationView
        negotiationId={1}
        negotiation={null}
        token={mockToken}
        onClose={mockOnClose}
      />
    );

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Test Case v. Defendant')).toBeInTheDocument();
    });

    // Check for Parties & Counsel heading
    expect(screen.getByText('Parties & Counsel')).toBeInTheDocument();

    // Check plaintiff information
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText(/Jane Smith/)).toBeInTheDocument();
    expect(screen.getByText(/Smith & Associates/)).toBeInTheDocument();

    // Check defendant information
    expect(screen.getByText('ABC Corporation')).toBeInTheDocument();
    expect(screen.getByText(/Bob Johnson/)).toBeInTheDocument();
    expect(screen.getByText(/Johnson Law Firm/)).toBeInTheDocument();
  });

  it('should show legacy attorney fields when no parties exist', async () => {
    const negotiationWithoutParties = {
      ...mockNegotiation,
      parties: [],
      plaintiff_attorney: 'Legacy Plaintiff Attorney',
      defendant_attorney: 'Legacy Defendant Attorney'
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/negotiations/')) {
        return Promise.resolve({ data: negotiationWithoutParties });
      }
      if (url.includes('/moves/')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/brackets')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/mediator-proposal')) {
        return Promise.resolve({ data: null });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <MediationView
        negotiationId={1}
        negotiation={null}
        token={mockToken}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Case v. Defendant')).toBeInTheDocument();
    });

    // Should show legacy fields
    expect(screen.getByText('Plaintiff Attorney (Legacy)')).toBeInTheDocument();
    expect(screen.getByText('Defendant Attorney (Legacy)')).toBeInTheDocument();
    expect(screen.getByText('Legacy Plaintiff Attorney')).toBeInTheDocument();
    expect(screen.getByText('Legacy Defendant Attorney')).toBeInTheDocument();

    // Should not show Parties & Counsel section
    expect(screen.queryByText('Parties & Counsel')).not.toBeInTheDocument();
  });

  it('should handle multiple plaintiffs and defendants', async () => {
    const negotiationWithMultipleParties = {
      ...mockNegotiation,
      parties: [
        { id: 1, role: 'plaintiff', party_name: 'Plaintiff 1', attorney_name: 'Attorney A', law_firm_name: 'Firm A' },
        { id: 2, role: 'plaintiff', party_name: 'Plaintiff 2', attorney_name: 'Attorney B', law_firm_name: 'Firm B' },
        { id: 3, role: 'defendant', party_name: 'Defendant 1', attorney_name: 'Attorney C', law_firm_name: 'Firm C' },
        { id: 4, role: 'defendant', party_name: 'Defendant 2', attorney_name: 'Attorney D', law_firm_name: 'Firm D' }
      ]
    };

    axios.get.mockImplementation((url) => {
      if (url.includes('/negotiations/')) {
        return Promise.resolve({ data: negotiationWithMultipleParties });
      }
      if (url.includes('/moves/')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/brackets')) {
        return Promise.resolve({ data: [] });
      }
      if (url.includes('/mediator-proposal')) {
        return Promise.resolve({ data: null });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    render(
      <MediationView
        negotiationId={1}
        negotiation={null}
        token={mockToken}
        onClose={mockOnClose}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Case v. Defendant')).toBeInTheDocument();
    });

    // Check for plural headings
    expect(screen.getByText('Plaintiffs')).toBeInTheDocument();
    expect(screen.getByText('Defendants')).toBeInTheDocument();

    // Check all parties are displayed
    expect(screen.getByText('Plaintiff 1')).toBeInTheDocument();
    expect(screen.getByText('Plaintiff 2')).toBeInTheDocument();
    expect(screen.getByText('Defendant 1')).toBeInTheDocument();
    expect(screen.getByText('Defendant 2')).toBeInTheDocument();
  });
});
