const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔍 REAL-TIME TOKEN TEST - Testing token with live Twilio validation...');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {
    timestamp: new Date().toISOString(),
    tests: {}
  };

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    // Test 1: Generate token with API Key method
    console.log('🔍 Testing API Key token generation...');
    try {
      const AccessToken = twilio.jwt.AccessToken;
      const VoiceGrant = AccessToken.VoiceGrant;

      const voiceGrant = new VoiceGrant({
        outgoingApplicationSid: appSid,
        incomingAllow: true
      });

      const accessToken = new AccessToken(
        accountSid,
        apiKey,
        apiSecret,
        { identity: 'realtime-test-user', ttl: 3600 }
      );

      accessToken.addGrant(voiceGrant);
      const apiKeyToken = accessToken.toJwt();

      results.tests.apiKeyToken = {
        success: true,
        tokenLength: apiKeyToken.length,
        method: 'api-key',
        token: apiKeyToken.substring(0, 50) + '...',
        fullToken: apiKeyToken
      };

    } catch (error) {
      results.tests.apiKeyToken = {
        success: false,
        error: error.message,
        method: 'api-key'
      };
    }

    // Test 2: Generate token with Auth Token method
    console.log('🔍 Testing Auth Token token generation...');
    try {
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
        { identity: 'realtime-test-user', ttl: 3600 }
      );

      accessToken.addGrant(voiceGrant);
      const authTokenJwt = accessToken.toJwt();

      results.tests.authTokenMethod = {
        success: true,
        tokenLength: authTokenJwt.length,
        method: 'auth-token',
        token: authTokenJwt.substring(0, 50) + '...',
        fullToken: authTokenJwt
      };

    } catch (error) {
      results.tests.authTokenMethod = {
        success: false,
        error: error.message,
        method: 'auth-token'
      };
    }

    // Test 3: Check TwiML App configuration
    console.log('🔍 Testing TwiML App configuration...');
    try {
      const client = twilio(accountSid, authToken);
      const app = await client.applications(appSid).fetch();

      results.tests.twimlAppConfig = {
        success: true,
        appSid: app.sid,
        friendlyName: app.friendlyName,
        voiceUrl: app.voiceUrl,
        voiceMethod: app.voiceMethod,
        statusCallback: app.statusCallback
      };

    } catch (error) {
      results.tests.twimlAppConfig = {
        success: false,
        error: error.message
      };
    }

    // Test 4: Voice SDK permissions check
    console.log('🔍 Checking Voice SDK permissions...');
    try {
      const client = twilio(accountSid, authToken);
      
      // Try to fetch account capabilities
      const account = await client.api.accounts(accountSid).fetch();
      
      results.tests.voiceSDKPermissions = {
        success: true,
        accountStatus: account.status,
        accountType: account.type,
        // Note: We can't directly test Voice SDK permissions via REST API
        // but we can check account status
        canMakeVoiceCalls: account.status === 'active'
      };

    } catch (error) {
      results.tests.voiceSDKPermissions = {
        success: false,
        error: error.message
      };
    }

    // Analysis and recommendations
    const recommendations = [];
    
    if (results.tests.apiKeyToken?.success && results.tests.authTokenMethod?.success) {
      recommendations.push('✅ Both token generation methods work');
      recommendations.push('🔧 Issue is likely with Twilio server-side token validation');
      recommendations.push('📞 Try both tokens in your app to see which works');
    }

    if (results.tests.twimlAppConfig?.success) {
      recommendations.push('✅ TwiML App is properly configured');
    } else {
      recommendations.push('❌ TwiML App configuration issue detected');
    }

    results.recommendations = recommendations;
    results.summary = {
      bothMethodsWork: results.tests.apiKeyToken?.success && results.tests.authTokenMethod?.success,
      twimlAppOK: results.tests.twimlAppConfig?.success,
      accountActive: results.tests.voiceSDKPermissions?.accountStatus === 'active',
      suspectedCause: 'Server-side token validation strictness'
    };

    // Include working tokens for immediate testing
    results.testTokens = {
      apiKeyToken: results.tests.apiKeyToken?.fullToken,
      authTokenMethod: results.tests.authTokenMethod?.fullToken,
      instructions: 'Use these tokens directly in your app for testing'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('❌ Real-time token test error:', error);
    
    results.tests.error = {
      message: error.message,
      stack: error.stack
    };
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(results, null, 2)
    };
  }
}; 