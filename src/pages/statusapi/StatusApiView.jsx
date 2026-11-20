import React, { useState } from 'react';
import { API_URL } from '../../utils/apiClient';

const STATUS_API_SERVICES = [
  { id: 'aadhar_card_details_by_otp_api', label: 'Aadhaar Card Details by OTP' },
  { id: 'advance_pan_verification', label: 'Advance PAN Verification' },
  { id: 'offline_aadhar_kyc', label: 'Aadhaar Paperless Offline e-KYC' },
  { id: 'pan_link_status', label: 'PAN-Aadhaar Link Status' },
  { id: 'indiapost', label: 'India Post Tracking' },
  { id: 'mobile_number_plans', label: 'Mobile Number Recharge Plans' },
  { id: 'pro_pan_verification', label: 'Pro PAN Verification by PAN Number' }
];

const INITIAL_PARAMETERS = JSON.stringify({ uidno: '' }, null, 2);

const StatusApiView = ({ theme = 'light' }) => {
  const [serviceId, setServiceId] = useState(STATUS_API_SERVICES[0].id);
  const [parametersText, setParametersText] = useState(INITIAL_PARAMETERS);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLightTheme = theme === 'light';

  const handleServiceChange = (event) => {
    const nextServiceId = event.target.value;
    setServiceId(nextServiceId);
    setParametersText(nextServiceId === STATUS_API_SERVICES[0].id ? INITIAL_PARAMETERS : '{}');
    setResult(null);
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setResult(null);

    let parameters;
    try {
      parameters = JSON.parse(parametersText);
    } catch {
      setError('Enter valid JSON for the provider request parameters.');
      return;
    }

    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      setError('Request parameters must be a JSON object.');
      return;
    }
    if (Object.keys(parameters).some(key => key.toLowerCase() === 'apikeyfill')) {
      setError('Do not enter an API key. The server adds it securely.');
      return;
    }

    const sessionToken = sessionStorage.getItem('sessionToken');
    if (!sessionToken) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/status-api/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ serviceId, parameters })
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'The Status API request failed.');
      }
      setResult(data.data);
    } catch (requestError) {
      setError(requestError.message || 'The Status API request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section style={{
      background: isLightTheme ? '#ffffff' : '#1e293b',
      border: `1px solid ${isLightTheme ? '#fed7aa' : '#334155'}`,
      borderRadius: '16px',
      boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
      color: isLightTheme ? '#1e293b' : '#e2e8f0',
      margin: '20px auto',
      maxWidth: '1000px',
      padding: '24px'
    }}>
      <h2 style={{ color: '#c2410c', margin: '0 0 8px' }}>Status API</h2>
      <p style={{ color: isLightTheme ? '#64748b' : '#94a3b8', marginTop: 0 }}>
        Choose one of the approved services and enter its provider request fields as JSON.
        The API key is added on the server and is never sent to this page.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor="status-api-service" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
          API service
        </label>
        <select
          id="status-api-service"
          value={serviceId}
          onChange={handleServiceChange}
          style={{
            background: isLightTheme ? '#ffffff' : '#0f172a',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            color: isLightTheme ? '#1e293b' : '#e2e8f0',
            fontSize: 14,
            marginBottom: 16,
            padding: '10px 12px',
            width: '100%'
          }}
        >
          {STATUS_API_SERVICES.map(service => (
            <option key={service.id} value={service.id}>{service.label}</option>
          ))}
        </select>

        <label htmlFor="status-api-parameters" style={{ display: 'block', fontWeight: 700, marginBottom: 6 }}>
          Request parameters (JSON)
        </label>
        <textarea
          id="status-api-parameters"
          value={parametersText}
          onChange={event => setParametersText(event.target.value)}
          rows={8}
          spellCheck="false"
          autoComplete="off"
          style={{
            background: isLightTheme ? '#0f172a' : '#020617',
            border: '1px solid #334155',
            borderRadius: 8,
            boxSizing: 'border-box',
            color: '#e2e8f0',
            fontFamily: 'Consolas, monospace',
            fontSize: 13,
            padding: 12,
            resize: 'vertical',
            width: '100%'
          }}
        />
        <small style={{ color: isLightTheme ? '#64748b' : '#94a3b8', display: 'block', marginTop: 6 }}>
          Enter only the fields required by the provider for the selected API. Do not include <code>apikeyfill</code>.
        </small>

        {error && <p role="alert" style={{ color: '#dc2626', marginBottom: 0 }}>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            background: isSubmitting ? '#9a3412' : '#ea580c',
            border: 0,
            borderRadius: 8,
            color: '#ffffff',
            cursor: isSubmitting ? 'wait' : 'pointer',
            fontSize: 14,
            fontWeight: 700,
            marginTop: 16,
            opacity: isSubmitting ? 0.75 : 1,
            padding: '11px 20px'
          }}
        >
          {isSubmitting ? 'Checking…' : 'Run API'}
        </button>
      </form>

      {result !== null && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ margin: '0 0 8px' }}>Provider response</h3>
          <pre style={{
            background: isLightTheme ? '#f8fafc' : '#0f172a',
            border: `1px solid ${isLightTheme ? '#e2e8f0' : '#334155'}`,
            borderRadius: 8,
            maxHeight: 420,
            overflow: 'auto',
            padding: 14,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}>
            {typeof result === 'string' ? result : JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
};

export default StatusApiView;
