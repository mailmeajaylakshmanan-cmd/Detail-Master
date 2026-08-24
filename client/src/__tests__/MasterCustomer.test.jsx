import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MasterCustomer from '../pages/MasterCustomer';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Setup React Query for tests
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (ui) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock the API hooks
vi.mock('../api/useQueries', () => ({
  useClients: () => ({
    data: [
      { id: 1, full_name: 'Test Executive Client', phone: '9999999999', address: '123 Test St', total_revenue: '500.00', total_visits: 1 }
    ],
    isLoading: false,
    isError: false,
  }),
  useVehicles: () => ({
    data: [
      { id: 101, client_id: 1, make_model: 'Tesla Model S', license_vin: 'TEST-VIN' }
    ],
    isLoading: false
  }),
  useAddClient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({ id: 2 })
  }),
  useUpdateClient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({})
  }),
  useDeleteClient: () => ({
    mutateAsync: vi.fn().mockResolvedValue({})
  }),
}));

describe('Executive Level UI Tests: MasterCustomer Component', () => {

  it('1. Should render the Master Customer header correctly', () => {
    renderWithProviders(<MasterCustomer />);
    expect(screen.getByText('Customer Management')).toBeDefined();
    expect(screen.getByText('Manage your customer database and communication')).toBeDefined();
  });

  it('2. Should display a list of clients from the mock API', async () => {
    renderWithProviders(<MasterCustomer />);
    // Verify the mock data is rendered in the table/cards
    expect(screen.getByText('Test Executive Client')).toBeDefined();
    expect(screen.getByText('9999999999')).toBeDefined();
  });

  it('3. Should open the Add Customer modal when clicking the Add Customer button', async () => {
    renderWithProviders(<MasterCustomer />);
    const addButton = screen.getByText('Add Customer');
    fireEvent.click(addButton);
    
    // Expect modal to be visible
    expect(screen.getByText('Add New Customer')).toBeDefined();
    
    // Check if form fields exist
    expect(screen.getByPlaceholderText(/e.g. John Doe/i)).toBeDefined();
    expect(screen.getByPlaceholderText(/10 digit mobile number/i)).toBeDefined();
  });

  it('4. Should validate empty fields on form submission', async () => {
    renderWithProviders(<MasterCustomer />);
    const addButton = screen.getByText('Add Customer');
    fireEvent.click(addButton);
    
    // Submit without filling fields
    const saveButton = screen.getByText('Save Customer');
    fireEvent.click(saveButton);
    
    // Verify error messages appear
    await waitFor(() => {
      expect(screen.getByText('Name is required')).toBeDefined();
      expect(screen.getByText('Phone number is required')).toBeDefined();
    });
  });

});
