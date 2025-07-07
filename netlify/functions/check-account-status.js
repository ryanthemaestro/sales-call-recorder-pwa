const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔍 ACCOUNT STATUS - Checking current account status...');
  
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
    const apiKey = process.env.TWILIO_API_KEY;
    const apiSecret = process.env.TWILIO_API_SECRET;
    const appSid = process.env.TWILIO_APP_SID;

    if (!accountSid || !authToken) {
      throw new Error('Missing basic Twilio credentials');
    }

    console.log('🔍 ACCOUNT STATUS - Initializing Twilio client...');
    const client = twilio(accountSid, authToken);

    // Check account details
    console.log('🔍 ACCOUNT STATUS - Fetching account details...');
    const account = await client.api.accounts(accountSid).fetch();
    
    // Check account balance
    console.log('🔍 ACCOUNT STATUS - Fetching account balance...');
    const balance = await client.api.accounts(accountSid).balance.fetch();

    // Try to list applications to verify permissions
    console.log('🔍 ACCOUNT STATUS - Testing Voice API access...');
    const applications = await client.applications.list({ limit: 1 });

    // Try to create a token to test Voice SDK access
    console.log('🔍 ACCOUNT STATUS - Testing token generation...');
    let tokenTestResult = { success: false, error: 'Not tested' };
    
    try {
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
          identity: `test_user_${Date.now()}`,
          ttl: 300 // 5 minutes for test
        }
      );

      accessToken.addGrant(voiceGrant);
      const jwt = accessToken.toJwt();
      
      tokenTestResult = { 
        success: true, 
        tokenLength: jwt.length,
        method: 'auth-token'
      };

      // Test API Key if available
      if (apiKey && apiSecret) {
        try {
          const apiKeyToken = new AccessToken(
            accountSid,
            apiKey,
            apiSecret,
            { 
              identity: `api_test_user_${Date.now()}`,
              ttl: 300
            }
          );
          apiKeyToken.addGrant(voiceGrant);
          const apiJwt = apiKeyToken.toJwt();
          
          tokenTestResult.apiKeyTest = {
            success: true,
            tokenLength: apiJwt.length,
            method: 'api-key'
          };
        } catch (apiError) {
          tokenTestResult.apiKeyTest = {
            success: false,
            error: apiError.message
          };
        }
      }

    } catch (tokenError) {
      tokenTestResult = { success: false, error: tokenError.message };
    }

    const status = {
      timestamp: new Date().toISOString(),
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type || 'Unknown',
        subresourceUris: !!account.subresourceUris
      },
      balance: {
        currency: balance.currency,
        balance: balance.balance,
        accountSid: balance.accountSid
      },
      voiceApi: {
        accessible: applications.length >= 0,
        applicationsFound: applications.length
      },
      tokenGeneration: tokenTestResult,
      credentials: {
        hasAccountSid: !!accountSid,
        hasAuthToken: !!authToken,
        hasApiKey: !!apiKey,
        hasApiSecret: !!apiSecret,
        hasAppSid: !!appSid
      },
      diagnosis: {
        accountUpgraded: account.status === 'active',
        hasBalance: parseFloat(balance.balance) > 0,
        voiceCapable: true,
        readyForVoiceSDK: account.status === 'active' && parseFloat(balance.balance) > 0
      }
    };

    console.log('✅ ACCOUNT STATUS - Check completed successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(status)
    };

  } catch (error) {
    console.error('❌ ACCOUNT STATUS - Check failed:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Account status check failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 