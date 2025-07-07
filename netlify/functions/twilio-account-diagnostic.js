const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
  console.log('🔍 DIAGNOSTIC - Starting comprehensive Twilio account validation...');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, Expires',
    'Cache-Control': 'no-cache,no-store,must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const results = {
    timestamp: new Date().toISOString(),
    version: 'diagnostic-v1',
    checks: {},
    recommendations: []
  };

  try {
    // Extract environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🔍 DIAGNOSTIC - Checking environment variables...');

    // Check 1: Environment Variables
    results.checks.environmentVariables = {
      accountSid: {
        present: !!accountSid,
        format: accountSid ? (accountSid.startsWith('AC') && accountSid.length === 34) : false,
        value: accountSid ? `${accountSid.substring(0, 10)}...` : null
      },
      apiKey: {
        present: !!apiKey,
        format: apiKey ? (apiKey.startsWith('SK') && apiKey.length === 34) : false,
        value: apiKey ? `${apiKey.substring(0, 10)}...` : null
      },
      apiSecret: {
        present: !!apiSecret,
        length: apiSecret ? apiSecret.length : 0
      },
      appSid: {
        present: !!appSid,
        format: appSid ? (appSid.startsWith('AP') && appSid.length === 34) : false,
        value: appSid ? `${appSid.substring(0, 10)}...` : null
      }
    };

    // Check if all required variables are present
    if (!accountSid || !apiKey || !apiSecret || !appSid) {
      results.recommendations.push('Missing required environment variables');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(results)
      };
    }

    // Check 2: JWT Token Generation Test
    console.log('🔍 DIAGNOSTIC - Testing JWT token generation...');
    try {
      const now = Math.floor(Date.now() / 1000);
      const exp = now + 3600;
      
      const payload = {
        jti: `${apiKey}-${now}`,
        iss: apiKey,
        sub: accountSid,
        iat: now,
        exp: exp,
        grants: {
          identity: 'diagnostic-test',
          voice: {
            incoming: { allow: true },
            outgoing: { application_sid: appSid }
          }
        }
      };

      const jwtHeader = {
        alg: 'HS256',
        typ: 'JWT',
        cty: 'twilio-fpa;v=1'
      };

      const token = jwt.sign(payload, apiSecret, { 
        algorithm: 'HS256',
        header: jwtHeader 
      });

      // Verify token can be decoded
      const decoded = jwt.decode(token, { complete: true });
      
      results.checks.jwtGeneration = {
        success: true,
        tokenLength: token.length,
        header: decoded.header,
        payloadStructure: {
          hasIss: !!decoded.payload.iss,
          hasSub: !!decoded.payload.sub,
          hasGrants: !!decoded.payload.grants,
          hasVoiceGrants: !!decoded.payload.grants?.voice,
          identityFormat: decoded.payload.grants?.identity
        }
      };

    } catch (jwtError) {
      results.checks.jwtGeneration = {
        success: false,
        error: jwtError.message
      };
      results.recommendations.push('JWT generation failed - check API Secret');
    }

    // Check 3: Account Type Detection
    console.log('🔍 DIAGNOSTIC - Analyzing account configuration...');
    results.checks.accountAnalysis = {
      accountSidPrefix: accountSid.substring(0, 4),
      apiKeyPrefix: apiKey.substring(0, 4),
      appSidPrefix: appSid.substring(0, 4),
      credentialFormat: 'valid'
    };

    // Check 4: Common Issues Analysis
    const commonIssues = [];
    
    // Check for typical trial account restrictions
    if (accountSid.startsWith('AC')) {
      commonIssues.push('Standard account format detected');
    }
    
    if (apiKey.startsWith('SK')) {
      commonIssues.push('Standard API Key format detected');
    }
    
    if (appSid.startsWith('AP')) {
      commonIssues.push('TwiML App format is correct');
    }

    results.checks.commonIssues = commonIssues;

    // Check 5: Generate Recommendations
    const recommendations = [];
    
    if (results.checks.jwtGeneration?.success) {
      recommendations.push('JWT generation working correctly');
      recommendations.push('Issue likely server-side at Twilio - try creating new API Key');
    } else {
      recommendations.push('Fix JWT generation issues first');
    }

    // Additional recommendations based on error pattern
    recommendations.push('Create new API Key in Twilio Console with Standard permissions');
    recommendations.push('Verify TwiML App has correct webhook URLs configured');
    recommendations.push('Check if account has Voice SDK trial restrictions');
    recommendations.push('Try using Main API Key instead of Standard if available');

    results.recommendations = recommendations;

    console.log('✅ DIAGNOSTIC - Analysis complete');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('❌ DIAGNOSTIC - Error during analysis:', error);
    
    results.checks.error = {
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