const twilio = require('twilio');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
    const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
    const TWILIO_API_KEY = process.env.TWILIO_API_KEY;
    const TWILIO_API_SECRET = process.env.TWILIO_API_SECRET;
    const TWILIO_APP_SID = process.env.TWILIO_APP_SID;

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Missing Twilio credentials' })
      };
    }

    // Test Twilio client
    const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    
    // Fetch account details to verify credentials
    const account = await client.api.accounts(TWILIO_ACCOUNT_SID).fetch();
    
    // Check if TwiML App exists
    let twimlApp = null;
    try {
      if (TWILIO_APP_SID) {
        twimlApp = await client.applications(TWILIO_APP_SID).fetch();
      }
    } catch (error) {
      console.error('TwiML App fetch error:', error);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        account: {
          sid: account.sid,
          friendlyName: account.friendlyName,
          status: account.status
        },
        twimlApp: twimlApp ? {
          sid: twimlApp.sid,
          friendlyName: twimlApp.friendlyName,
          voiceUrl: twimlApp.voiceUrl,
          voiceMethod: twimlApp.voiceMethod
        } : null,
        credentials: {
          accountSid: !!TWILIO_ACCOUNT_SID,
          authToken: !!TWILIO_AUTH_TOKEN,
          apiKey: !!TWILIO_API_KEY,
          apiSecret: !!TWILIO_API_SECRET,
          appSid: !!TWILIO_APP_SID
        }
      })
    };

  } catch (error) {
    console.error('Twilio test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Twilio test failed',
        details: error.message
      })
    };
  }
}; 