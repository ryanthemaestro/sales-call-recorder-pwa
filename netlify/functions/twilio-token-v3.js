const twilio = require('twilio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
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

    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
    const TWILIO_APP_SID = process.env.TWILIO_APP_SID;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_API_KEY || !TWILIO_API_SECRET || !TWILIO_APP_SID) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Missing Twilio credentials',
          missing: {
            accountSid: !TWILIO_ACCOUNT_SID,
            apiKey: !TWILIO_API_KEY,
            apiSecret: !TWILIO_API_SECRET,
            appSid: !TWILIO_APP_SID
          }
        })
      };
    }

    // Use the exact pattern from Twilio docs
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create a Voice Grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_APP_SID,
      incomingAllow: true
    });

    // Create an Access Token with identity in options
    const accessToken = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { identity: identity }
    );

    // Add the grant
    accessToken.addGrant(voiceGrant);

    // Generate the JWT
    const jwt = accessToken.toJwt();

    console.log('V3: Generated token for identity:', identity);
    console.log('V3: Account SID:', TWILIO_ACCOUNT_SID);
    console.log('V3: API Key:', TWILIO_API_KEY);
    console.log('V3: App SID:', TWILIO_APP_SID);
    console.log('V3: JWT length:', jwt.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: jwt,
        identity: identity,
        version: 'v3-docs-pattern'
      })
    };

  } catch (error) {
    console.error('V3 Token generation error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Token generation failed',
        details: error.message,
        stack: error.stack
      })
    };
  }
}; 