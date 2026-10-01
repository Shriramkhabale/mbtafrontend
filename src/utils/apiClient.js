export const getApiBaseUrl = () => {
  const configuredUrl = process.env.REACT_APP_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/$/, '');

  const hostname = (typeof window !== 'undefined' && window.location.hostname) || 'localhost';
  return `http://${hostname}:5000`;
};

export const API_URL = getApiBaseUrl();

export const apiFetch = (path, options) =>
  fetch(`${getApiBaseUrl()}${path}`, options);