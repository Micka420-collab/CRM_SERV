// Mode DEMO - utiliser le token stocké dans localStorage
// En production, remplacer par Supabase Auth

const API_URL = process.env.NEXT_PUBLIC_LICENSE_SERVER_URL || 'http://localhost:4000';

interface RequestOptions {
  method?: string;
  body?: unknown;
}

export async function apiRequest(endpoint: string, options: RequestOptions = {}) {
  const { method = 'GET', body } = options;

  // Get token from localStorage (mode DEMO)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || errorData.error || `Erreur ${response.status}`);
    }

    return response.json();
  } catch (err: any) {
    if (err.message === 'Failed to fetch') {
      throw new Error('Impossible de contacter le serveur de licence. Verifiez que le serveur est demarre sur http://localhost:4000');
    }
    throw err;
  }
}

// Auth API
export const authAPI = {
  register: (email: string, password: string, name?: string) =>
    apiRequest('/api/v1/auth/register', { method: 'POST', body: { email, password, name } }),

  login: (email: string, password: string) =>
    apiRequest('/api/v1/auth/login', { method: 'POST', body: { email, password } }),

  me: () => apiRequest('/api/v1/auth/me'),

  forgotPassword: (email: string) =>
    apiRequest('/api/v1/auth/forgot-password', { method: 'POST', body: { email } }),

  resetPassword: (token: string, password: string) =>
    apiRequest('/api/v1/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// Plans API
export const plansAPI = {
  list: () => apiRequest('/api/v1/plans'),
};

// Subscription API
export const subscriptionAPI = {
  checkout: (planName: string, billingInterval: string) =>
    apiRequest('/api/v1/subscriptions/checkout', {
      method: 'POST',
      body: { planName, billingInterval },
    }),

  portal: () =>
    apiRequest('/api/v1/subscriptions/portal', { method: 'POST' }),

  me: () =>
    apiRequest('/api/v1/subscriptions/me'),

  licenses: () =>
    apiRequest('/api/v1/subscriptions/licenses'),

  createTrial: () =>
    apiRequest('/api/v1/subscriptions/trial', { method: 'POST' }),
};

// Admin API
export const adminAPI = {
  getDashboard: () =>
    apiRequest('/api/v1/admin/dashboard'),

  listLicenses: (filters: any = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/api/v1/admin/licenses?${params.toString()}`);
  },

  revokeLicense: (id: string) =>
    apiRequest(`/api/v1/admin/licenses/${id}/revoke`, { method: 'POST' }),

  renewLicense: (id: string, days: number) =>
    apiRequest(`/api/v1/admin/licenses/${id}/renew`, {
      method: 'POST',
      body: { days },
    }),

  listUsers: (filters: any = {}) => {
    const params = new URLSearchParams(filters);
    return apiRequest(`/api/v1/admin/users?${params.toString()}`);
  },

  listPlans: () =>
    apiRequest('/api/v1/admin/plans'),
};

// Updates API
export const updatesAPI = {
  listVersions: () =>
    apiRequest('/api/v1/updates/versions'),

  createVersion: (data: any) =>
    apiRequest('/api/v1/updates/versions', { method: 'POST', body: data }),

  deleteVersion: (id: string) =>
    apiRequest(`/api/v1/updates/versions/${id}`, { method: 'DELETE' }),

  listDevices: () =>
    apiRequest('/api/v1/updates/devices'),

  forceUpdate: (data: any) =>
    apiRequest('/api/v1/updates/force-all', { method: 'POST', body: data }),

  getStats: (versionId: string) =>
    apiRequest(`/api/v1/updates/stats/${versionId}`),
};
