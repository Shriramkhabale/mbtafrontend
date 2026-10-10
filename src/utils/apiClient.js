export const getApiBaseUrl = () => {
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  // When running locally on localhost, always connect to the local backend on port 5000
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.') || hostname.startsWith('10.') || hostname.endsWith('.local')) {
    return `http://${hostname}:5000`;
  }

  const configuredUrl = process.env.REACT_APP_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  return `http://${hostname}:5000`;
};

export const API_URL = getApiBaseUrl();

export const apiFetch = (path, options) =>
  fetch(`${getApiBaseUrl()}${path}`, options);