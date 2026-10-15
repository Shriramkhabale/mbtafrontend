export const getApiBaseUrl = () => {
  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';

  // Always prefer the explicitly configured API URL from the .env file
  const configuredUrl = process.env.REACT_APP_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  // Fallback: connect to local backend on port 5000
  return `http://${hostname}:5000`;
};

export const API_URL = getApiBaseUrl();

export const apiFetch = (path, options) =>
  fetch(`${getApiBaseUrl()}${path}`, options);