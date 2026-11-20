import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ETDSResultPage from './ETDSResultPage';

const mockNavigate = jest.fn();
const originalFetch = global.fetch;

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('ETDSResultPage', () => {
  beforeEach(() => {
    sessionStorage.setItem('sessionToken', 'test-session-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'success' })
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    global.fetch = originalFetch;
    mockNavigate.mockClear();
  });

  test('returns to PAN application history after provider success', async () => {
    render(
      <MemoryRouter initialEntries={['/etds-result?ref=123e4567-e89b-12d3-a456-426614174000']}>
        <ETDSResultPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pancard?tab=history', { replace: true });
    });
  });

  test('returns to history after a failed provider response', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ status: 'failed' })
    });

    render(
      <MemoryRouter initialEntries={['/etds-result?ref=123e4567-e89b-12d3-a456-426614174000']}>
        <ETDSResultPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/pancard?tab=history', { replace: true });
    });
  });

  test('shows application and provider acknowledgment numbers while status is pending', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        status: 'pending',
        ackNumber: 'MBM2026112012345',
        providerAcknowledgementNumber: 'PAN123456789'
      })
    });

    render(
      <MemoryRouter initialEntries={['/etds-result?ref=123e4567-e89b-12d3-a456-426614174000']}>
        <ETDSResultPage />
      </MemoryRouter>
    );

    expect(await screen.findByText('MBM2026112012345')).toBeInTheDocument();
    expect(screen.getByText('PAN123456789')).toBeInTheDocument();
  });
});
