import React, { useState } from 'react';
import { API_URL } from '../../utils/apiClient';
import './StatusApiView.css';

const STATUS_API_SERVICES = [
  { id: 'aadhar_card_details_by_otp_api', label: 'Aadhaar Card Details by OTP' },
  { id: 'advance_pan_verification', label: 'Advance PAN Verification' },
  { id: 'offline_aadhar_kyc', label: 'Aadhaar Paperless Offline e-KYC' },
  { id: 'pan_link_status', label: 'PAN-Aadhaar Link Status' },
  { id: 'indiapost', label: 'India Post Tracking' },
  { id: 'mobile_number_plans', label: 'Mobile Number Recharge Plans' },
  { id: 'pro_pan_verification', label: 'Pro PAN Verification by PAN Number' }
];

const PARAMETER_EXAMPLES = {
  aadhar_card_details_by_otp_api: { uidno: '' },
  mobile_number_plans: { mobile_number: '' }
};

const formatResponse = value => (
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)
);

const getProviderMessage = providerData => (
  providerData && typeof providerData === 'object'
    ? providerData.response?.text || providerData.message
    : ''
);

const StatusApiView = ({ theme = 'light' }) => {
  const [serviceId, setServiceId] = useState(STATUS_API_SERVICES[0].id);
  const [parametersText, setParametersText] = useState(
    JSON.stringify(PARAMETER_EXAMPLES[STATUS_API_SERVICES[0].id], null, 2)
  );
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [providerError, setProviderError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLightTheme = theme === 'light';

  const handleServiceChange = event => {
    const nextServiceId = event.target.value;
    setServiceId(nextServiceId);
    setParametersText(JSON.stringify(PARAMETER_EXAMPLES[nextServiceId] || {}, null, 2));
    setResult(null);
    setError('');
    setProviderError(null);
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setError('');
    setProviderError(null);
    setResult(null);

    let parameters;
    try {
      parameters = JSON.parse(parametersText);
    } catch {
      setError('This is not valid JSON. Check the example and include quotes around field names and text values.');
      return;
    }

    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
      setError('Request parameters must be a JSON object, for example {"mobile_number":"9876543210"}.');
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
        setError(data.message || `The Status API request failed (HTTP ${response.status}).`);
        setProviderError(data.data ?? null);
        return;
      }

      if (data.data && typeof data.data === 'object' && data.data.success === false) {
        setError(getProviderMessage(data.data) || 'The provider could not complete this request.');
        setProviderError(data.data);
        return;
      }

      setResult(data.data);
    } catch (requestError) {
      setError(requestError.message || 'Could not reach the server. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={`status-api${isLightTheme ? '' : ' status-api--dark'}`}>
      <header className="status-api__header">
        <div>
          <span className="status-api__eyebrow">PROVIDER TOOLS</span>
          <h2>Status API</h2>
          <p>Run an approved provider service and inspect its response.</p>
        </div>
        <div className="status-api__security">
          <span aria-hidden="true">🔒</span>
          API credentials are added securely on the server
        </div>
      </header>

      <div className="status-api__layout">
        <form className="status-api__form" onSubmit={handleSubmit}>
          <div className="status-api__field">
            <label htmlFor="status-api-service">Choose a service</label>
            <select id="status-api-service" value={serviceId} onChange={handleServiceChange}>
              {STATUS_API_SERVICES.map(service => (
                <option key={service.id} value={service.id}>{service.label}</option>
              ))}
            </select>
          </div>

          <div className="status-api__field">
            <label htmlFor="status-api-parameters">Request parameters</label>
            <textarea
              id="status-api-parameters"
              value={parametersText}
              onChange={event => setParametersText(event.target.value)}
              rows={9}
              spellCheck="false"
              autoComplete="off"
              aria-describedby="status-api-parameter-help"
            />
            <small id="status-api-parameter-help">
              Enter a JSON object using the exact field names required by the provider. Do not include
              {' '}<code>apikeyfill</code>.
            </small>
          </div>

          {error && <div className="status-api__alert" role="alert">{error}</div>}

          <button className="status-api__submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Checking…' : 'Run service'}
          </button>
        </form>

        <aside className="status-api__help">
          <h3>How to use</h3>
          <ol>
            <li>Choose the API service you need.</li>
            <li>Enter its required fields as a JSON object.</li>
            <li>Run the service to see the provider response.</li>
          </ol>
          {serviceId === 'mobile_number_plans' ? (
            <div className="status-api__example">
              <strong>Mobile plans example</strong>
              <code>{'{"mobile_number":"9876543210"}'}</code>
              <span>Use the required mobile number. Do not add the provider API key.</span>
            </div>
          ) : (
            <p className="status-api__note">
              Required fields differ by service. Use the field names listed in your provider
              documentation; this tool does not guess or send missing fields.
            </p>
          )}
        </aside>
      </div>

      {providerError !== null && (
        <section className="status-api__response status-api__response--error" aria-label="Provider error details">
          <h3>Provider response details</h3>
          <pre>{formatResponse(providerError)}</pre>
        </section>
      )}

      {result !== null && (
        <section className="status-api__response" aria-label="Provider response">
          <h3>Provider response</h3>
          <pre>{formatResponse(result)}</pre>
        </section>
      )}
    </section>
  );
};

export default StatusApiView;
