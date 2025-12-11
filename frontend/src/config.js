// API Configuration
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const config = {
  apiUrl: API_URL,
  isDevelopment: import.meta.env.DEV,
  isProduction: import.meta.env.PROD,
};

export default config;
