const configuredApiUrl = String(import.meta.env.VITE_SERVER_URL || '').trim();
const browserOrigin = typeof window !== 'undefined' ? window.location.origin : '';

function pointsToLocalhost(value = '') {
  return /localhost|127\.0\.0\.1/i.test(String(value));
}

const shouldPreferBrowserOrigin =
  Boolean(browserOrigin) &&
  !pointsToLocalhost(browserOrigin) &&
  pointsToLocalhost(configuredApiUrl);

// When the frontend is served by the backend for local demo/submission use,
// same-origin avoids extra deployment, proxy, and CORS setup.
export const API_URL =
  shouldPreferBrowserOrigin
    ? browserOrigin
    : configuredApiUrl || browserOrigin || 'http://localhost:5000';

export function getStoredToken() {
  return localStorage.getItem('dialect_token') || sessionStorage.getItem('dialect_token');
}

export function storeToken(token, rememberMe = true) {
  if (rememberMe) {
    localStorage.setItem('dialect_token', token);
    sessionStorage.removeItem('dialect_token');
  } else {
    sessionStorage.setItem('dialect_token', token);
    localStorage.removeItem('dialect_token');
  }
}

export function clearStoredToken() {
  localStorage.removeItem('dialect_token');
  sessionStorage.removeItem('dialect_token');
}
