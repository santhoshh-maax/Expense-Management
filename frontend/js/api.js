/**
 * Frontend API Client with Firebase ID Token Injection
 */

const Api = {
  getBaseUrl() {
    return (window.CONFIG && window.CONFIG.API_BASE_URL) || 'http://localhost:5000/api/v1';
  },

  async request(endpoint, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;

    // Get Auth Token
    const token = await window.Auth.getIdToken();

    const headers = {
      Accept: 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (options.body && !(options.body instanceof FormData) && typeof options.body === 'object') {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Special handling for CSV export
      if (response.headers.get('content-type')?.includes('text/csv')) {
        if (!response.ok) throw new Error('Failed to download CSV');
        const text = await response.text();
        return text;
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (response.status === 401) {
          console.warn('[API] Token expired or unauthorized. Redirecting to login.');
          localStorage.removeItem('demo_session_user');
          window.location.href = 'login.html';
        }

        const message = data?.message || data?.error?.code || `HTTP error ${response.status}`;
        const err = new Error(message);
        err.status = response.status;
        err.details = data?.error?.details || null;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Request Error] ${options.method || 'GET'} ${endpoint}:`, err);
      throw err;
    }
  },

  get(endpoint, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    return this.request(url, { method: 'GET' });
  },

  post(endpoint, body = {}) {
    return this.request(endpoint, { method: 'POST', body });
  },

  patch(endpoint, body = {}) {
    return this.request(endpoint, { method: 'PATCH', body });
  },

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },
};

window.Api = Api;
