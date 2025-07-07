const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🔬 DEEP DIAGNOSTIC - Comprehensive Twilio configuration check...');
  
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

    console.log('🔬 DEEP: Initializing Twilio client...');
    const client = twilio(accountSid, authToken);

    const results = {
      timestamp: new Date().toISOString(),
      credentials: {},
      account: {},
      twimlApp: {},
      apiKey: {},
      tokenTests: {},
      voiceConfiguration: {}
    };

    // 1. Check credentials
    console.log('🔬 DEEP: Checking credentials...');
    results.credentials = {
      hasAccountSid: !!accountSid,
      hasAuthToken: !!authToken,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
      hasAppSid: !!appSid,
      accountSidFormat: accountSid?.startsWith('AC') && accountSid?.length === 34,
      authTokenLength: authToken?.length,
      apiKeyFormat: apiKey?.startsWith('SK') && apiKey?.length === 34,
      apiSecretLength: apiSecret?.length,
      appSidFormat: appSid?.startsWith('AP') && appSid?.length === 34
    };

    // 2. Check account details
    console.log('🔬 DEEP: Fetching account details...');
    try {
      const account = await client.api.accounts(accountSid).fetch();
      results.account = {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated,
        dateUpdated: account.dateUpdated
      };
    } catch (error) {
      results.account = { error: error.message };
    }

    // 3. Check TwiML Application
    console.log('🔬 DEEP: Checking TwiML Application...');
    try {
      const app = await client.applications(appSid).fetch();
      results.twimlApp = {
        sid: app.sid,
        friendlyName: app.friendlyName,
        voiceUrl: app.voiceUrl,
        voiceMethod: app.voiceMethod,
        voiceFallbackUrl: app.voiceFallbackUrl,
        voiceFallbackMethod: app.voiceFallbackMethod,
        statusCallback: app.statusCallback,
        statusCallbackMethod: app.statusCallbackMethod,
        voiceCallerIdLookup: app.voiceCallerIdLookup,
        dateCreated: app.dateCreated,
        dateUpdated: app.dateUpdated
      };
    } catch (error) {
      results.twimlApp = { error: error.message };
    }

    // 4. Check API Key if available
    if (apiKey) {
      console.log('🔬 DEEP: Checking API Key...');
      try {
        const key = await client.keys(apiKey).fetch();
        results.apiKey = {
          sid: key.sid,
          friendlyName: key.friendlyName,
          dateCreated: key.dateCreated,
          dateUpdated: key.dateUpdated
        };
      } catch (error) {
        results.apiKey = { error: error.message };
      }
    }

    // 5. Test token generation with different methods
    console.log('🔬 DEEP: Testing token generation methods...');
    const AccessToken = twilio.jwt.AccessToken;
    const VoiceGrant = AccessToken.VoiceGrant;

    const voiceGrant = new VoiceGrant({
      outgoingApplicationSid: appSid,
      incomingAllow: true
    });

    // Test Auth Token method
    try {
      console.log('🔬 DEEP: Testing Auth Token method...');
      const authTokenAccessToken = new AccessToken(
        accountSid,
        accountSid,
        authToken,
        { identity: 'test_auth_token', ttl: 300 }
      );
      authTokenAccessToken.addGrant(voiceGrant);
      const authJwt = authTokenAccessToken.toJwt();
      
      const authParts = authJwt.split('.');
      const authPayload = JSON.parse(Buffer.from(authParts[1], 'base64').toString());
      
      results.tokenTests.authToken = {
        success: true,
        tokenLength: authJwt.length,
        payload: {
          iss: authPayload.iss,
          sub: authPayload.sub,
          identity: authPayload.grants?.identity,
          appSid: authPayload.grants?.voice?.outgoing?.application_sid,
          iat: authPayload.iat,
          exp: authPayload.exp
        }
      };
    } catch (error) {
      results.tokenTests.authToken = { success: false, error: error.message };
    }

    // Test API Key method if available
    if (apiKey && apiSecret) {
      try {
        console.log('🔬 DEEP: Testing API Key method...');
        const apiKeyAccessToken = new AccessToken(
          accountSid,
          apiKey,
          apiSecret,
          { identity: 'test_api_key', ttl: 300 }
        );
        apiKeyAccessToken.addGrant(voiceGrant);
        const apiJwt = apiKeyAccessToken.toJwt();
        
        const apiParts = apiJwt.split('.');
        const apiPayload = JSON.parse(Buffer.from(apiParts[1], 'base64').toString());
        
        results.tokenTests.apiKey = {
          success: true,
          tokenLength: apiJwt.length,
          payload: {
            iss: apiPayload.iss,
            sub: apiPayload.sub,
            identity: apiPayload.grants?.identity,
            appSid: apiPayload.grants?.voice?.outgoing?.application_sid,
            iat: apiPayload.iat,
            exp: apiPayload.exp
          }
        };
      } catch (error) {
        results.tokenTests.apiKey = { success: false, error: error.message };
      }
    }

    // 6. Check Voice configuration
    console.log('🔬 DEEP: Checking Voice configuration...');
    try {
      // List phone numbers
      const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 5 });
      results.voiceConfiguration.phoneNumbers = phoneNumbers.map(num => ({
        phoneNumber: num.phoneNumber,
        friendlyName: num.friendlyName,
        voiceUrl: num.voiceUrl,
        voiceMethod: num.voiceMethod,
        voiceApplicationSid: num.voiceApplicationSid
      }));

      // Check if any phone numbers are configured to use this TwiML App
      const appConnectedNumbers = phoneNumbers.filter(num => num.voiceApplicationSid === appSid);
      results.voiceConfiguration.numbersUsingApp = appConnectedNumbers.length;
      
    } catch (error) {
      results.voiceConfiguration = { error: error.message };
    }

    console.log('✅ DEEP: Diagnostic completed successfully');
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(results, null, 2)
    };

  } catch (error) {
    console.error('❌ DEEP: Diagnostic failed:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Deep diagnostic failed',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 