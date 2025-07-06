exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
    const CallSid = params.get('CallSid');
    const RecordingUrl = params.get('RecordingUrl');
    const RecordingSid = params.get('RecordingSid');
    
    console.log('Recording completed:', {
      CallSid,
      RecordingUrl,
      RecordingSid
    });

    // In a production app, you'd save this to a database
    // For now, we'll just log it
    console.log(`Call ${CallSid} recording available at: ${RecordingUrl}`);

    // You could trigger transcription here by calling another function
    // or saving to a database for later processing

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: 'success' })
    };

  } catch (error) {
    console.error('Recording callback error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to process recording callback' })
    };
  }
}; 