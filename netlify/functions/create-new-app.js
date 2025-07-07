const twilio = require('twilio');

exports.handler = async (event, context) => {
  console.log('🆕 CREATE APP - Creating new TwiML App for Voice SDK...');
  
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

    if (!accountSid || !authToken) {
      throw new Error('Missing required Twilio credentials');
    }

    console.log('🆕 CREATE APP: Initializing Twilio client...');
    const client = twilio(accountSid, authToken);

    console.log('🆕 CREATE APP: Creating new TwiML Application...');
    
    // Create a new TwiML App with minimal configuration for Voice SDK
    const application = await client.applications.create({
      friendlyName: 'Sales Agent Voice SDK App - ' + new Date().toISOString().slice(0, 19),
      voiceUrl: '', // Empty voice URL for Voice SDK usage
      voiceMethod: 'POST',
      statusCallback: '',
      statusCallbackMethod: 'POST'
    });

    console.log('✅ CREATE APP: New TwiML App created successfully');
    console.log('🆕 CREATE APP: App SID:', application.sid);

    const result = {
      success: true,
      timestamp: new Date().toISOString(),
      newApp: {
        sid: application.sid,
        friendlyName: application.friendlyName,
        voiceUrl: application.voiceUrl,
        voiceMethod: application.voiceMethod,
        dateCreated: application.dateCreated,
        dateUpdated: application.dateUpdated
      },
      instructions: {
        step1: 'Update your Netlify environment variable TWILIO_APP_SID to: ' + application.sid,
        step2: 'Redeploy your application after updating the environment variable',
        step3: 'Test the Voice SDK with the new App SID'
      },
      environmentVariableUpdate: {
        name: 'TWILIO_APP_SID',
        oldValue: process.env.TWILIO_APP_SID,
        newValue: application.sid
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2)
    };

  } catch (error) {
    console.error('❌ CREATE APP: Failed to create new TwiML App:', error.message);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to create new TwiML App',
        details: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
}; 