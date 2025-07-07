const crypto = require('crypto');
const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔍 JWT VERIFY - Manual JWT verification...');
  
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
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const appSid = process.env.TWILIO_APP_SID;

    if (!accountSid || !authToken || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    console.log('🔍 VERIFY: Creating token with Twilio SDK...');
    
    // Create token with Twilio SDK
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    const accessToken = new AccessToken(
      accountSid,
      accountSid,
      authToken,
      { 
        identity: 'verify_test_user',
        ttl: 300 // 5 minutes
      }
    );

    accessToken.addGrant(voiceGrant);
    const jwt = accessToken.toJwt();

    console.log('🔍 VERIFY: Token generated, verifying structure...');

    // Parse JWT manually
    const parts = jwt.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }

    const header = JSON.parse(Buffer.from(parts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const signature = parts[2];

    console.log('🔍 VERIFY: JWT parts parsed successfully');

    // Verify signature manually
    const expectedSignature = crypto
      .createHmac('sha256', authToken)
      .update(parts[0] + '.' + parts[1])
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');

    const signatureValid = signature === expectedSignature;

    console.log('🔍 VERIFY: Signature verification complete');

    // Check all required fields
    const validations = {
      hasHeader: !!header,
      headerAlg: header?.alg === 'HS256',
      headerTyp: header?.typ === 'JWT',
      headerCty: header?.cty === 'twilio-fpa;v=1',
      
      hasPayload: !!payload,
      payloadIss: payload?.iss === accountSid,
      payloadSub: payload?.sub === accountSid,
      payloadJti: !!payload?.jti,
      payloadIat: !!payload?.iat,
      payloadExp: !!payload?.exp,
      
      hasGrants: !!payload?.grants,
      hasIdentity: !!payload?.grants?.identity,
      hasVoiceGrant: !!payload?.grants?.voice,
      hasIncoming: payload?.grants?.voice?.incoming?.allow === true,
      hasOutgoing: !!payload?.grants?.voice?.outgoing,
      hasAppSid: payload?.grants?.voice?.outgoing?.application_sid === appSid,
      
      signatureValid: signatureValid,
      tokenNotExpired: payload?.exp > Math.floor(Date.now() / 1000)
    };

    // Try to verify with Twilio's method
    console.log('🔍 VERIFY: Testing with Twilio client validation...');
    let twilioValidation = { error: 'Not tested' };
    
    try {
      const client = twilio(accountSid, authToken);
      // Test by making a simple API call that would use the same auth
      await client.api.accounts(accountSid).fetch();
      twilioValidation = { success: true, message: 'Auth Token works with Twilio API' };
    } catch (error) {
      twilioValidation = { success: false, error: error.message };
    }

    const result = {
      timestamp: new Date().toISOString(),
      jwt: {
        raw: jwt,
        length: jwt.length,
        parts: parts.length
      },
      header: header,
      payload: {
        iss: payload?.iss,
        sub: payload?.sub,
        jti: payload?.jti,
        iat: payload?.iat,
        exp: payload?.exp,
        identity: payload?.grants?.identity,
        voice: payload?.grants?.voice
      },
      validations: validations,
      twilioValidation: twilioValidation,
      signature: {
        provided: signature,
        expected: expectedSignature,
        valid: signatureValid
      },
      environment: {
        accountSid: accountSid,
        appSid: appSid,
        authTokenLength: authToken?.length,
        nodeVersion: process.version
      },
      allValid: Object.values(validations).every(v => v === true)
    };

    console.log('✅ VERIFY: Verification completed');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('❌ VERIFY: Verification failed:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'JWT verification failed',
        details: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 