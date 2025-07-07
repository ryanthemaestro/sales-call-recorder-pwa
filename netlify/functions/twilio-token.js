const twilio = require('twilio');

exports.handler = async (event, context) => {
  // Set CORS headers for all responses
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return { 
      statusCode: 200, 
      headers, 
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ 
        error: 'Method Not Allowed',
        message: 'Only POST requests are allowed'
      })
    };
  }

  try {
    // Validate environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('Environment check:', {
      accountSid: accountSid ? `${accountSid.substring(0, 8)}...` : 'missing',
      authToken: authToken ? 'present' : 'missing',
      apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing',
      apiSecret: apiSecret ? 'present' : 'missing',
      appSid: appSid ? `${appSid.substring(0, 8)}...` : 'missing'
    });

    if (!accountSid || !authToken || !apiKey || !apiSecret || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    // Parse request body
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.log('No JSON body, using default identity');
      }
    }

    // Generate identity with 2025 best practices
    const identity = requestBody.identity || `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Validate identity according to 2025 standards
    if (identity.length > 121) {
      throw new Error('Identity must be 121 characters or less');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(identity)) {
      throw new Error('Identity can only contain alphanumeric characters and underscores');
    }

    console.log('Generating token for identity:', identity);

    // Create AccessToken with 2025 best practices
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create access token with proper TTL (24 hours max as per 2025 guidelines)
    const token = new AccessToken(
      accountSid,
      apiKey,
      apiSecret,
      {
        identity: identity,
        ttl: 3600 // 1 hour TTL for better security
      }
    );

    // Create voice grant with 2025 configuration
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    // Add the grant to the token
    token.addGrant(voiceGrant);

    // Generate the JWT
    const jwt = token.toJwt();

    console.log('Token generated successfully for identity:', identity);
    console.log('Token length:', jwt.length);
    console.log('Token preview:', `${jwt.substring(0, 50)}...`);

    // Return the token with comprehensive response
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: jwt,
        identity: identity,
        ttl: 3600,
        timestamp: new Date().toISOString(),
        version: '2025.1',
        success: true
      })
    };

  } catch (error) {
    console.error('Token generation error:', error);
    
    // Enhanced error response for debugging
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Token generation failed',
        message: error.message,
        timestamp: new Date().toISOString(),
        success: false,
        debug: {
          hasAccountSid: !!process.env.TWILIO_ACCOUNT_SID,
          hasAuthToken: !!process.env.TWILIO_AUTH_TOKEN,
          hasApiKey: !!process.env.TWILIO_API_KEY,
          hasApiSecret: !!process.env.TWILIO_API_SECRET,
          hasAppSid: !!process.env.TWILIO_APP_SID
        }
      })
    };
  }
}; 