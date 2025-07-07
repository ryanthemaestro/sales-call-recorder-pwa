const jwt = require('jsonwebtoken');

exports.handler = async (event, context) => {
  console.log('🔧 TOKEN 2025 - Bulletproof token generation v4...');
  
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Cache-Control, Pragma, Expires',
    'Cache-Control': 'no-cache,no-store,must-revalidate,proxy-revalidate,max-age=0',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Surrogate-Control': 'no-store'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // Extract environment variables with strict validation
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🔧 Environment validation:');
    console.log('Account SID:', accountSid ? `${accountSid.substring(0, 10)}...` : 'MISSING');
    console.log('API Key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'MISSING');
    console.log('API Secret:', apiSecret ? 'PRESENT' : 'MISSING');
    console.log('App SID:', appSid ? `${appSid.substring(0, 10)}...` : 'MISSING');

    // Validate ALL required credentials
    if (!accountSid || !apiKey || !apiSecret || !appSid) {
      console.error('❌ Missing required environment variables');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Missing required Twilio credentials',
          missing: {
            accountSid: !accountSid,
            apiKey: !apiKey,
            apiSecret: !apiSecret,
            appSid: !appSid
          }
        })
      };
    }

    // Validate format of credentials
    if (!accountSid.startsWith('AC') || accountSid.length !== 34) {
      throw new Error('Invalid Account SID format');
    }
    if (!apiKey.startsWith('SK') || apiKey.length !== 34) {
      throw new Error('Invalid API Key format');
    }
    if (!appSid.startsWith('AP') || appSid.length !== 34) {
      throw new Error('Invalid App SID format');
    }

    // Get identity with strict validation
    const queryParams = event.queryStringParameters || {};
    let identity = queryParams.identity;
    
    if (!identity) {
      // Create a clean, simple identity
      identity = `user${Date.now()}`;
    }

    // Clean identity for 2025 Voice SDK (only alphanumeric + underscore, max 121 chars)
    identity = identity.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121);
    
    if (!identity) {
      identity = `user${Date.now()}`;
    }

    console.log('🔧 Using identity:', identity);

    // Current time with precise timing
    const now = Math.floor(Date.now() / 1000);
    const expiration = now + 3600; // Exactly 1 hour

    console.log('🔧 Token timing:');
    console.log('Issued at (iat):', now, new Date(now * 1000).toISOString());
    console.log('Expires at (exp):', expiration, new Date(expiration * 1000).toISOString());

    // Create the most compliant JWT payload possible for 2025
    const jwtPayload = {
      // Standard JWT fields (required)
      jti: `${apiKey}-${now}`,        // Unique JWT ID
      iss: apiKey,                    // Issuer MUST be API Key for 2025
      sub: accountSid,                // Subject MUST be Account SID
      iat: now,                       // Issued at time
      exp: expiration,                // Expiration time
      
      // Twilio-specific grants (required)
      grants: {
        identity: identity,           // Client identity
        voice: {
          incoming: {
            allow: true               // Allow incoming calls
          },
          outgoing: {
            application_sid: appSid   // TwiML App for outgoing calls
          }
        }
      }
    };

    // JWT header for maximum 2025 compatibility
    const jwtHeader = {
      alg: 'HS256',                   // Required algorithm
      typ: 'JWT',                     // Required type
      cty: 'twilio-fpa;v=1'          // Required content type for 2025
    };

    console.log('🔧 JWT Payload created:', JSON.stringify(jwtPayload, null, 2));
    console.log('🔧 JWT Header created:', JSON.stringify(jwtHeader, null, 2));

    // Generate JWT with explicit options for maximum compliance
    const accessToken = jwt.sign(
      jwtPayload,               // Payload
      apiSecret,                // Secret (API Secret)
      {
        algorithm: 'HS256',     // Explicit algorithm
        header: jwtHeader       // Custom header
      }
    );

    console.log('✅ JWT token generated successfully');
    console.log('🔧 Token length:', accessToken.length);
    console.log('🔧 Token preview:', accessToken.substring(0, 50) + '...');

    // Decode and verify the token structure
    const decoded = jwt.decode(accessToken, { complete: true });
    console.log('🔍 Token verification:');
    console.log('Header:', JSON.stringify(decoded.header));
    console.log('Payload grants:', JSON.stringify(decoded.payload.grants));
    
    // Additional validation checks
    if (decoded.payload.iss !== apiKey) {
      throw new Error(`JWT issuer mismatch: expected ${apiKey}, got ${decoded.payload.iss}`);
    }
    if (decoded.payload.sub !== accountSid) {
      throw new Error(`JWT subject mismatch: expected ${accountSid}, got ${decoded.payload.sub}`);
    }
    if (!decoded.payload.grants || !decoded.payload.grants.voice) {
      throw new Error('JWT missing voice grants');
    }

    const response = {
      success: true,
      token: accessToken,
      identity: identity,
      ttl: 3600,
      version: '2025.4-bulletproof',
      timestamp: new Date().toISOString(),
      debug: {
        tokenLength: accessToken.length,
        issuer: apiKey,
        subject: accountSid,
        applicationSid: appSid,
        identity: identity,
        issuedAt: new Date(now * 1000).toISOString(),
        expiresAt: new Date(expiration * 1000).toISOString(),
        jwtId: `${apiKey}-${now}`,
        headerValid: decoded.header.alg === 'HS256' && decoded.header.typ === 'JWT',
        payloadValid: decoded.payload.iss === apiKey && decoded.payload.sub === accountSid
      }
    };

    console.log('✅ Response prepared with full validation');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('❌ Token generation failed:', error.message);
    console.error('❌ Stack trace:', error.stack);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'JWT token generation failed',
        details: error.message,
        version: '2025.4-bulletproof',
        timestamp: new Date().toISOString()
      })
    };
  }
}; 