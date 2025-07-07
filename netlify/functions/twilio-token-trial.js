const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔧 TRIAL TOKEN - Generating token optimized for trial accounts...');
  
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
    const appSid = process.env.TWILIO_APP_SID;

    console.log('🔧 TRIAL: Using Auth Token method for maximum compatibility...');

    if (!accountSid || !authToken || !appSid) {
      throw new Error('Missing required Twilio credentials');
    }

    // For trial accounts, use the most compatible identity format
    const identity = requestBody.identity || `trial_user_${Date.now()}`;
    const cleanIdentity = identity.replace(/[^a-zA-Z0-9_]/g, '').substring(0, 121);
    
    console.log('🔧 TRIAL: Using identity:', cleanIdentity);

    // Use Auth Token method - most compatible with trial accounts
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    // Create Voice Grant with trial-friendly settings
    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    // Create Access Token using Auth Token (works better for trials)
    const accessToken = new AccessToken(
      accountSid,
      accountSid, // Use Account SID as key
      authToken,  // Use Auth Token as secret
      { 
        identity: cleanIdentity,
        ttl: 1800 // Shorter TTL for trial accounts (30 minutes)
      }
    );

    accessToken.addGrant(voiceGrant);
    const jwt = accessToken.toJwt();

    console.log('✅ TRIAL: Token generated successfully');
    console.log('JWT length:', jwt.length);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        token: jwt,
        identity: cleanIdentity,
        method: 'trial-optimized-auth-token',
        ttl: 1800,
        timestamp: new Date().toISOString(),
        accountType: 'trial',
        note: 'Token optimized for trial account limitations',
        upgradeInfo: {
          message: 'For full Voice SDK features, upgrade your account',
          upgradeUrl: 'https://console.twilio.com/billing/payment-methods'
        }
      })
    };

  } catch (error) {
    console.error('❌ TRIAL: Token generation failed:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Trial token generation failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        accountType: 'trial',
        upgradeRecommendation: 'Consider upgrading to a paid account for full Voice SDK access'
      })
    };
  }
}; 