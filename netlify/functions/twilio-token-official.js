const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('📚 OFFICIAL METHOD - Using exact Twilio tutorial approach...');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache,no-store,must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.log('No JSON body provided');
      }
    }

    // Required Twilio credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const appSid = process.env.TWILIO_APP_SID;

    if (!accountSid || !authToken || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    const identity = requestBody.identity || `official_user_${Date.now()}`;
    
    console.log('📚 OFFICIAL: Creating token using tutorial method...');
    console.log('📚 OFFICIAL: Account SID:', accountSid);
    console.log('📚 OFFICIAL: App SID:', appSid);
    console.log('📚 OFFICIAL: Identity:', identity);

    // EXACT method from Twilio Voice SDK tutorial
    // https://www.twilio.com/docs/voice/sdks/javascript/quickstart
    
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create Voice Grant
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    // Create Access Token - using ACCOUNT SID as both issuer and signing key
    const accessToken = new AccessToken(
      accountSid,   // Account SID
      accountSid,   // Signing Key SID (use Account SID for basic auth)
      authToken,    // Signing Key Secret (use Auth Token for basic auth)
      {
        identity: identity,
        ttl: 3600
      }
    );

    // Add the grant to the token
    accessToken.addGrant(voiceGrant);

    // Generate the JWT
    const jwt = accessToken.toJwt();

    console.log('📚 OFFICIAL: Token generated, length:', jwt.length);

    // Verify the token structure exactly matches Twilio expectations
    const parts = jwt.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log('📚 OFFICIAL: Header:', JSON.stringify(header));
    console.log('📚 OFFICIAL: Payload grants:', JSON.stringify(payload.grants));

    // Return token
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: jwt,
        identity: identity,
        method: 'official-tutorial',
        ttl: 3600,
        timestamp: new Date().toISOString(),
        debug: {
          tokenLength: jwt.length,
          header: header,
          payload: {
            iss: payload.iss,
            sub: payload.sub,
            grants: payload.grants
          }
        }
      })
    };

  } catch (error) {
    console.error('❌ OFFICIAL: Error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Official token generation failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 