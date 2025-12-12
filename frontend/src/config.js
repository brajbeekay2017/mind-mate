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

// ✅ CRITICAL: Centralized API configuration with robust fallback

const API_URL = (() => {
  // Check environment variable first
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== 'undefined') {
    console.log('✅ [CONFIG] Using VITE_API_URL:', envUrl);
    return envUrl;
  }

  // Check hostname to determine API URL
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Development environment
    const devUrl = 'http://localhost:4000';
    console.log('✅ [CONFIG] Using localhost development URL:', devUrl);
    return devUrl;
  }

  // Production environment - use same domain
  const prodUrl = `${protocol}//${hostname === 'mindmate.aapnainfotech.in' ? 'mindmateapi.aapnainfotech.in' : hostname}`;
  console.log('✅ [CONFIG] Using production URL:', prodUrl);
  return prodUrl;
})();

// ✅ Validation on load
if (!API_URL) {
  console.error('❌ [CONFIG] API_URL is empty!');
}

if (API_URL.includes('undefined')) {
  console.error('❌ [CONFIG] API_URL contains "undefined":', API_URL);
}

console.log('🔗 [CONFIG] Final API_URL:', API_URL);

export { API_URL };
