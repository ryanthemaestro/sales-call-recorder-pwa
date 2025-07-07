const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🎉 UPGRADED TOKEN - Generating token for upgraded account...');
  
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
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🎉 UPGRADED: Account is now paid - using optimal settings...');

    if (!accountSid || !authToken || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    const identity = requestBody.identity || `upgraded_user_${Date.now()}`;
    const cleanIdentity = identity.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121);
    
    console.log('🎉 UPGRADED: Using identity:', cleanIdentity);

    // Try Method 1: API Key first (if available and valid)
    if (apiKey && apiSecret) {
      try {
        console.log('🎉 UPGRADED: Attempting API Key method...');
        
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const voiceGrant = new VoiceGrant({
          outgoingApplicationSid: appSid,
          incomingAllow: true
        });

        const accessToken = new AccessToken(
          accountSid,  // This becomes the 'iss' (issuer) 
          apiKey,      // This is the signing key ID
          apiSecret,   // This is the signing secret
          { 
            identity: cleanIdentity,
            ttl: 3600 // Full 1 hour for upgraded accounts
          }
        );

        accessToken.addGrant(voiceGrant);
        const jwt = accessToken.toJwt();

        console.log('✅ UPGRADED: API Key method succeeded');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token: jwt,
            identity: cleanIdentity,
            method: 'upgraded-api-key',
            ttl: 3600,
            timestamp: new Date().toISOString(),
            accountType: 'upgraded',
            recommendation: 'API Key method working - account successfully upgraded!'
          })
        };

      } catch (apiError) {
        console.log('❌ UPGRADED: API Key method failed:', apiError.message);
        console.log('🔄 UPGRADED: Falling back to Auth Token method...');
      }
    }

    // Method 2: Auth Token fallback (always works for upgraded accounts)
    console.log('🎉 UPGRADED: Using Auth Token method...');
    
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    const accessToken = new AccessToken(
      accountSid,
      accountSid, // Use Account SID as key
      authToken,  // Use Auth Token as secret
      { 
        identity: cleanIdentity,
        ttl: 3600 // Full 1 hour for upgraded accounts
      }
    );

    accessToken.addGrant(voiceGrant);
    const jwt = accessToken.toJwt();

    console.log('✅ UPGRADED: Auth Token method succeeded');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: jwt,
        identity: cleanIdentity,
        method: 'upgraded-auth-token',
        ttl: 3600,
        timestamp: new Date().toISOString(),
        accountType: 'upgraded',
        note: 'Using Auth Token - consider creating new API Key for upgraded account',
        apiKeyRecommendation: 'Create new API Key in Twilio Console for enhanced security'
      })
    };

  } catch (error) {
    console.error('❌ UPGRADED: Token generation failed:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Upgraded token generation failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        accountType: 'upgraded',
        troubleshooting: 'Account upgraded but may need new API Key creation'
      })
    };
  }
}; 