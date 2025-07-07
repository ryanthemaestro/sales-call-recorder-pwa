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

  try {
    const { identity } = JSON.parse(event.body || '{}');
    
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
    const TWILIO_APP_SID = process.env.TWILIO_APP_SID;

    // Method 1: Using API Key/Secret (current approach)
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: TWILIO_APP_SID,
      incomingAllow: true
    });

    const token = new AccessToken(
      TWILIO_ACCOUNT_SID,
      TWILIO_API_KEY,
      TWILIO_API_SECRET,
      { identity: identity || 'debug-user' }
    );

    token.addGrant(voiceGrant);

    // Decode the token to see what's inside
    const jwt = token.toJwt();
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        token: jwt,
        identity: identity || 'debug-user',
        debug: {
          accountSid: TWILIO_ACCOUNT_SID,
          apiKey: TWILIO_API_KEY,
          appSid: TWILIO_APP_SID,
          tokenPayload: payload,
          sdkVersion: require('twilio/package.json').version
        }
      })
    };

  } catch (error) {
    console.error('Debug token error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message,
        stack: error.stack
      })
    };
  }
}; 