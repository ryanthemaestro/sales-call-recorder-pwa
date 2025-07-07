const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔧 FIXED TOKEN - Starting token generation with updated approach...');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache,no-store,must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Parse request
    let requestBody = {};
    if (event.body) {
      try {
        requestBody = JSON.parse(event.body);
      } catch (e) {
        console.log('No JSON body provided');
      }
    }

    // Get credentials
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🔧 Environment check:');
    console.log('Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'MISSING');
    console.log('Auth Token:', authToken ? 'PRESENT' : 'MISSING');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('API Secret:', apiSecret ? 'PRESENT' : 'MISSING');
    console.log('App SID:', appSid ? `${appSid.substring(0, 10)}...` : 'MISSING');

    if (!accountSid || !authToken || !apiKey || !apiSecret || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    // Generate clean identity
    const identity = requestBody.identity || `user${Date.now()}`;
    const cleanIdentity = identity.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121);
    
    console.log('🔧 Using identity:', cleanIdentity);

    // Try Method 1: Standard API Key approach (current best practice)
    try {
      console.log('🔧 Attempting Method 1: Standard API Key...');
      
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      // Create Voice Grant
      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: appSid,
        incomingAllow: true
      });

      // Create Access Token - exact pattern from Twilio docs
      const accessToken = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { 
          identity: cleanIdentity,
          ttl: 3600 // 1 hour
        }
      );

      accessToken.addGrant(voiceGrant);
      const jwt = accessToken.toJwt();

      console.log('✅ Method 1 succeeded - API Key approach');
      console.log('JWT length:', jwt.length);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          token: jwt,
          identity: cleanIdentity,
          method: 'api-key-standard',
          ttl: 3600,
          timestamp: new Date().toISOString(),
          debug: {
            accountSid: accountSid,
            apiKey: apiKey,
            appSid: appSid,
            identityUsed: cleanIdentity
          }
        })
      };

    } catch (apiKeyError) {
      console.log('❌ Method 1 failed:', apiKeyError.message);
      
      // Try Method 2: Auth Token fallback
      try {
        console.log('🔧 Attempting Method 2: Auth Token fallback...');
        
        const AccessToken = twilio.jwt.AccessToken;
        const VoiceGrant = AccessToken.VoiceGrant;

        const voiceGrant = new VoiceGrant({
          outgoingApplicationSid: appSid,
          incomingAllow: true
        });

        // Use Account SID as both the account and key, Auth Token as secret
        const accessToken = new AccessToken(
          accountSid,
          accountSid, // Use Account SID as key
          authToken,  // Use Auth Token as secret
          { 
            identity: cleanIdentity,
            ttl: 3600
          }
        );

        accessToken.addGrant(voiceGrant);
        const jwt = accessToken.toJwt();

        console.log('✅ Method 2 succeeded - Auth Token approach');
        
        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({
            success: true,
            token: jwt,
            identity: cleanIdentity,
            method: 'auth-token-fallback',
            ttl: 3600,
            timestamp: new Date().toISOString(),
            debug: {
              accountSid: accountSid,
              appSid: appSid,
              identityUsed: cleanIdentity,
              note: 'Using Auth Token method due to API Key issues'
            }
          })
        };

      } catch (authTokenError) {
        console.log('❌ Method 2 failed:', authTokenError.message);
        throw new Error(`Both methods failed: API Key: ${apiKeyError.message}, Auth Token: ${authTokenError.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    console.error('Stack:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Token generation failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        method: 'fixed-endpoint'
      })
    };
  }
}; 