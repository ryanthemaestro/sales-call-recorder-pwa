const twilio = require('twilio');
const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
  console.log('🔍 API KEY VALIDATION - Testing your specific API Key...');
  
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Cache-Control': 'no-cache,no-store,must-revalidate'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {
    timestamp: new Date().toISOString(),
    version: 'api-key-test-v1',
    tests: {}
  };

  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🔍 Testing API Key:', apiKey ? `${apiKey.substring(0, 15)}...` : 'MISSING');

    // Test 1: API Key format validation
    results.tests.formatValidation = {
      accountSidFormat: accountSid?.startsWith('AC') && accountSid?.length === 34,
      apiKeyFormat: apiKey?.startsWith('SK') && apiKey?.length === 34,
      appSidFormat: appSid?.startsWith('AP') && appSid?.length === 34,
      secretLength: apiSecret?.length || 0
    };

    // Test 2: Try creating JWT with your exact API Key
    try {
      console.log('🔍 Test 2: Creating JWT with Twilio SDK...');
      
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
        { identity: 'test-validation-user' }
      );

      accessToken.addGrant(voiceGrant);
      const jwtToken = accessToken.toJwt();

      // Decode to verify structure
      const decoded = jwt.decode(jwtToken, { complete: true });

      results.tests.twilioSDKGeneration = {
        success: true,
        tokenLength: jwtToken.length,
        header: decoded.header,
        payloadKeys: Object.keys(decoded.payload),
        issuer: decoded.payload.iss,
        subject: decoded.payload.sub,
        grants: decoded.payload.grants ? Object.keys(decoded.payload.grants) : []
      };

    } catch (sdkError) {
      results.tests.twilioSDKGeneration = {
        success: false,
        error: sdkError.message,
        stack: sdkError.stack
      };
    }

    // Test 3: Manual JWT creation (to compare)
    try {
      console.log('🔍 Test 3: Creating JWT manually...');
      
      const now = Math.floor(Date.now() / 1000);
      const payload = {
        jti: `${apiKey}-${now}`,
        iss: apiKey,
        sub: accountSid,
        iat: now,
        exp: now + 3600,
        grants: {
          identity: 'test-validation-user',
          voice: {
            incoming: { allow: true },
            outgoing: { application_sid: appSid }
          }
        }
      };

      const manualToken = jwt.sign(payload, apiSecret, {
        algorithm: 'HS256',
        header: {
          alg: 'HS256',
          typ: 'JWT',
          cty: 'twilio-fpa;v=1'
        }
      });

      results.tests.manualJWTGeneration = {
        success: true,
        tokenLength: manualToken.length,
        payload: payload
      };

    } catch (manualError) {
      results.tests.manualJWTGeneration = {
        success: false,
        error: manualError.message
      };
    }

    // Test 4: Test API Key with Twilio REST API
    try {
      console.log('🔍 Test 4: Testing API Key with REST API...');
      
      const client = twilio(apiKey, apiSecret, { accountSid: accountSid });
      const account = await client.api.accounts(accountSid).fetch();

      results.tests.restAPIValidation = {
        success: true,
        accountStatus: account.status,
        accountFriendlyName: account.friendlyName
      };

    } catch (restError) {
      results.tests.restAPIValidation = {
        success: false,
        error: restError.message,
        code: restError.code
      };
    }

    // Test 5: Check if there are any account restrictions
    results.tests.accountInfo = {
      accountType: accountSid?.startsWith('AC') ? 'Standard' : 'Unknown',
      apiKeyAge: 'Unknown', // Would need API call to get creation date
      suspectedIssues: []
    };

    // Analyze results and provide recommendations
    const recommendations = [];
    
    if (results.tests.twilioSDKGeneration?.success) {
      recommendations.push('✅ Twilio SDK can generate tokens with your API Key');
    } else {
      recommendations.push('❌ Twilio SDK fails with your API Key - this is the root issue');
    }

    if (results.tests.restAPIValidation?.success) {
      recommendations.push('✅ API Key works for REST API calls');
    } else {
      recommendations.push('❌ API Key fails for basic REST API - key may be invalid');
    }

    if (!results.tests.twilioSDKGeneration?.success && results.tests.restAPIValidation?.success) {
      recommendations.push('🔧 API Key works for REST but not Voice SDK - try creating new API Key');
    }

    results.recommendations = recommendations;
    results.summary = {
      overallStatus: results.tests.twilioSDKGeneration?.success ? 'PASS' : 'FAIL',
      primaryIssue: results.tests.twilioSDKGeneration?.success ? 'None detected' : 'API Key incompatible with Voice SDK',
      nextStep: results.tests.twilioSDKGeneration?.success ? 'Debug client-side' : 'Create new Standard API Key'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('❌ API Key validation error:', error);
    
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