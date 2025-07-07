const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🎯 FINAL TOKEN - Using most basic reliable approach...');
  
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

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const appSid = requestBody.appSid || process.env.TWILIO_APP_SID;

    console.log('🎯 FINAL: Using Auth Token method (most reliable)...');

    if (!accountSid || !authToken || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    const identity = requestBody.identity || `final_user_${Date.now()}`;
    const cleanIdentity = identity.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121);
    
    console.log('🎯 FINAL: Using identity:', cleanIdentity);
    console.log('🎯 FINAL: Account SID:', accountSid);
    console.log('🎯 FINAL: App SID:', appSid);

    // Use the Auth Token method - most reliable for upgraded accounts
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    console.log('🎯 FINAL: Creating VoiceGrant...');
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    console.log('🎯 FINAL: Creating AccessToken with Auth Token method...');
    console.log('🎯 FINAL: Account SID (issuer):', accountSid);
    console.log('🎯 FINAL: App SID:', appSid);
    
    const accessToken = new AccessToken(
      accountSid,   // Account SID (becomes issuer in JWT)
      accountSid,   // Use Account SID as signing key ID  
      authToken,    // Auth Token as signing secret
      { 
        identity: cleanIdentity,
        ttl: 3600   // 1 hour
      }
    );

    console.log('🎯 FINAL: Adding voice grant...');
    accessToken.addGrant(voiceGrant);

    console.log('🎯 FINAL: Generating JWT...');
    const jwt = accessToken.toJwt();

    console.log('🎯 FINAL: JWT generated successfully, length:', jwt.length);

    // Decode and verify the token structure
    const parts = jwt.split('.');
    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    console.log('🎯 FINAL: Token header:', JSON.stringify(header));
    console.log('🎯 FINAL: Token payload iss:', payload.iss);
    console.log('🎯 FINAL: Token payload sub:', payload.sub);
    console.log('🎯 FINAL: Token payload identity:', payload.grants?.identity);
    console.log('🎯 FINAL: Token payload app_sid:', payload.grants?.voice?.outgoing?.application_sid);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: jwt,
        identity: cleanIdentity,
        method: 'final-auth-token',
        ttl: 3600,
        timestamp: new Date().toISOString(),
        accountType: 'upgraded',
        debug: {
          tokenLength: jwt.length,
          header: header,
          payloadIss: payload.iss,
          payloadSub: payload.sub,
          payloadIdentity: payload.grants?.identity,
          payloadAppSid: payload.grants?.voice?.outgoing?.application_sid
        }
      })
    };

  } catch (error) {
    console.error('❌ FINAL: Token generation failed:', error.message);
    console.error('❌ FINAL: Full error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Final token generation failed',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 