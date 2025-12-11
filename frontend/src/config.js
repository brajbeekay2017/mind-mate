// API Configuration - switches based on environment
const getApiUrl = () => {
  // Check if we're in production (can be set via build process or runtime)
  const isProduction = import.meta.env.MODE === 'production' || 
                       import.meta.env.VITE_NODE_ENV === 'production' ||
                       window.location.hostname !== 'localhost';
  
  if (isProduction) {
    return 'https://mindmateapi.aapnainfotech.in';
  }
  
  return import.meta.env.VITE_API_URL || 'http://localhost:4000';
};

export const API_URL = getApiUrl();

console.log('🌐 API URL:', API_URL);
