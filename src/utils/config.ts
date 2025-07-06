// Configuration utility for handling local vs production environments
const isProduction = process.env.NODE_ENV === 'production' || window.location.hostname !== 'localhost';
const isNetlify = window.location.hostname.includes('netlify.app');

export const API_CONFIG = {
  // Base API URL
  BASE_URL: isNetlify 
    ? 'https://sales-call-recorder-pwa.netlify.app/.netlify/functions'
    : 'http://localhost:3001/api',
  
  // Specific endpoints
  ENDPOINTS: {
    TWILIO_TOKEN: isNetlify ? '/twilio-token' : '/twilio/token',
    TWILIO_CONFIG: isNetlify ? '/twilio-config' : '/twilio/config',
    TRANSCRIBE: isNetlify ? '/transcribe' : '/transcribe',
    TRANSCRIBE_URL: isNetlify ? '/transcribe-url' : '/transcribe-url',
    HEALTH: isNetlify ? '/health' : '/health',
    ANALYZE_CALL: isNetlify ? '/analyze-call' : '/analyze-call'
  }
};

export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Environment detection utilities
export const ENV = {
  IS_PRODUCTION: isProduction,
  IS_NETLIFY: isNetlify,
  IS_LOCAL: !isProduction && !isNetlify,
  HOSTNAME: window.location.hostname
};

// Logging utility that respects environment
export const envLog = (message: string, data?: any) => {
  if (!ENV.IS_PRODUCTION) {
    console.log(`[${ENV.IS_NETLIFY ? 'NETLIFY' : 'LOCAL'}] ${message}`, data);
  }
}; 