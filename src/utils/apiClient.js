export const getApiBaseUrl = () => {
  // Always prefer the explicitly configured API URL first
  const configuredUrl = process.env.REACT_APP_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  // Fallback: connect to local backend on port 5000 when no URL is configured
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  return `http://${hostname}:5000`;
};

export const API_URL = getApiBaseUrl();

export const apiFetch = (path, options) =>
  fetch(`${getApiBaseUrl()}${path}`, options);