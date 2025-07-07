const twilio = require('twilio');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { identity } = JSON.parse(event.body);
    
    if (!identity) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Identity required' })
      };
    }

    // Get Twilio credentials from environment variables
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_APP_SID = process.env.TWILIO_APP_SID;

    // Check if Twilio credentials are configured
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Twilio not configured. Please set your Twilio credentials.',
          needsSetup: true
        })
      };
    }

    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create voice grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_APP_SID,
      incomingAllow: true
    });

    // Create access token using Auth Token instead of API Key/Secret
    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_ACCOUNT_SID, // Use Account SID as key
      TWILIO_AUTH_TOKEN,  // Use Auth Token as secret
      { 
        identity,
        ttl: 3600 // 1 hour expiration
      }
    );

    token.addGrant(voiceGrant);

    // Debug logging
    console.log('ALT: Token generated for identity:', identity);
    console.log('ALT: Using Auth Token method');
    console.log('ALT: Using App SID:', TWILIO_APP_SID);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: token.toJwt(),
        identity,
        method: 'auth-token'
      })
    };

  } catch (error) {
    console.error('Error generating Twilio token (alt):', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to generate access token' })
    };
  }
}; 