const twilio = require('twilio');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'text/xml'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    // Parse the form data from Twilio
    const params = new URLSearchParams(event.body);
    const To = params.get('To');
    
    const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
    
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Dial the target number
    const dial = twiml.dial({
      callerId: TWILIO_PHONE_NUMBER,
      record: 'record-from-answer-dual-channel',
      recordingStatusCallback: 'https://sales-call-recorder-pwa.netlify.app/.netlify/functions/twilio-recording-callback'
    });
    
    dial.number(To);
    
    return {
      statusCode: 200,
      headers,
      body: twiml.toString()
    };

  } catch (error) {
    console.error('Error handling voice webhook:', error);
    
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, there was an error processing your call.');
    
    return {
      statusCode: 500,
      headers,
      body: twiml.toString()
    };
  }
}; 