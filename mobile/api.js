const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000/api';

const request = async (path, options = {}) => {
  const response = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'API request failed');
  }

  return payload.data;
};

export const listSubscriptions = () => request('/subscriptions');
