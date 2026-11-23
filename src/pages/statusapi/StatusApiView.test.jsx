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

  test('treats a failed provider status as a failure even when HTTP succeeds', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: { message: null, status: 'failed' }
      })
    });

    render(<StatusApiView />);
    fireEvent.change(screen.getByLabelText('Request parameters'), {
      target: { value: '{"uidno":"123456789012"}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The provider returned status "failed" without an explanation.'
    );
    expect(screen.getByLabelText('Provider error details')).toHaveTextContent('"status": "failed"');
    expect(screen.queryByLabelText('One-time password (OTP)')).not.toBeInTheDocument();
  });

  test('rejects malformed JSON before sending a request', async () => {
    render(<StatusApiView />);
    fireEvent.change(screen.getByLabelText('Request parameters'), {
      target: { value: '{7020181674}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('This is not valid JSON');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('sends an OTP, then submits it with the provider session token', async () => {
    global.fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { message: 'OTP sent successfully', token: '[redacted]' },
          otpToken: 'otp-session-token'
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { verified: true } })
      });

    render(<StatusApiView />);
    fireEvent.change(screen.getByLabelText('Request parameters'), {
      target: { value: '{"uidno":"123456789012"}' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send OTP' }));

    const otpInput = await screen.findByLabelText('One-time password (OTP)');
    fireEvent.change(otpInput, { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Verify OTP' }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));
    expect(JSON.parse(global.fetch.mock.calls[0][1].body).parameters).toEqual({
      uidno: '123456789012'
    });
    expect(JSON.parse(global.fetch.mock.calls[1][1].body).parameters).toEqual({
      uidno: '123456789012',
      otp: '654321',
      token: 'otp-session-token'
    });
    expect(await screen.findByLabelText('Provider response')).toHaveTextContent('"verified": true');
  });
});
