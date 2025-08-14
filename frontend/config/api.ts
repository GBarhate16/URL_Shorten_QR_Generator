// API Configuration
export const API_CONFIG = {
  // Backend API URL - can be overridden by environment variables
  BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000',
  
  // API Endpoints
  ENDPOINTS: {
    // User endpoints
    REGISTER: '/api/users/register/',
    LOGIN: '/api/users/login/',
    LOGOUT: '/api/users/logout/',
    PROFILE: '/api/users/profile/',
    CHANGE_PASSWORD: '/api/users/change-password/',
    RESET_PASSWORD: '/api/users/password-reset/',
    VERIFY_PASSWORD_RESET: '/api/users/password-reset/',
    RESEND_VERIFICATION: '/api/users/resend-verification/',
    USER_STATS: '/api/users/stats/',
    
    // URL endpoints
    URLS: '/api/urls/',
    URL_REDIRECT: '/api/urls/redirect/',
    URLS_ANALYTICS: '/api/urls/analytics/',
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to get endpoint URL
export const getApiUrl = (endpointKey: keyof typeof API_CONFIG.ENDPOINTS): string => {
  return buildApiUrl(API_CONFIG.ENDPOINTS[endpointKey]);
};
