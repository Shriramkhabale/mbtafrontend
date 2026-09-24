export const getApiBaseUrl = () => {
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

  if (isLocal) {
    return `http://${hostname}:5000`;
  }

  const configuredUrl = process.env.REACT_APP_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  return `http://${hostname}:5000`;
};

export const API_URL = getApiBaseUrl();

export const apiFetch = (path, options) =>
  fetch(`${getApiBaseUrl()}${path}`, options);