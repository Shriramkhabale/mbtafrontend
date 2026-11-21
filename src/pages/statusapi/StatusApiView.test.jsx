import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StatusApiView from './StatusApiView';

describe('StatusApiView', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    sessionStorage.setItem('sessionToken', 'test-session-token');
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, data: { verified: true } })
    });
  });

  afterEach(() => {
    sessionStorage.clear();
    global.fetch = originalFetch;
  });

  test('shows only the seven selected services and sends no API key from the browser', async () => {
    render(<StatusApiView />);
    expect(screen.getAllByRole('option')).toHaveLength(7);

    fireEvent.change(screen.getByLabelText('Choose a service'), {
      target: { value: 'pro_pan_verification' }
    });
    fireEvent.change(screen.getByLabelText('Request parameters'), {
      target: { value: '{"pan":"ABCDE1234F"}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run service' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    const request = global.fetch.mock.calls[0][1];
    expect(JSON.parse(request.body)).toEqual({
      serviceId: 'pro_pan_verification',
      parameters: { pan: 'ABCDE1234F' }
    });
    expect(JSON.parse(request.body)).not.toHaveProperty('apikeyfill');
  });

  test('shows a valid mobile plans example and explains provider failures', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          success: false,
          response: { code: '103', text: 'Recharge plans not available for the specified operator, circle.' }
        }
      })
    });

    render(<StatusApiView />);
    fireEvent.change(screen.getByLabelText('Choose a service'), {
      target: { value: 'mobile_number_plans' }
    });

    const parameters = screen.getByLabelText('Request parameters');
    expect(parameters).toHaveValue(JSON.stringify({ mobile_number: '' }, null, 2));
    fireEvent.change(parameters, {
      target: { value: '{"mobile_number":"9876543210"}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run service' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Recharge plans not available for the specified operator, circle.'
    );
    expect(screen.getByLabelText('Provider error details')).toHaveTextContent('"code": "103"');
  });

  test('rejects malformed JSON before sending a request', async () => {
    render(<StatusApiView />);
    fireEvent.change(screen.getByLabelText('Request parameters'), {
      target: { value: '{7020181674}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Run service' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This is not valid JSON');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
