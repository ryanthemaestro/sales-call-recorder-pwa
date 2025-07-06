import React, { useState, useEffect } from 'react';
import { Device } from '@twilio/voice-sdk';
import { getApiUrl, ENV, envLog } from '../utils/config';

interface TwilioIntegrationProps {
  onCallStart?: (callId: string) => void;
  onCallEnd?: (callId: string, duration: number) => void;
  onError?: (error: string) => void;
}

const TwilioIntegration: React.FC<TwilioIntegrationProps> = ({
  onCallStart,
  onCallEnd,
  onError
}) => {
  const [device, setDevice] = useState<Device | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    initializeTwilio();
  }, []);

  const initializeTwilio = async () => {
    try {
      envLog('Initializing Twilio Voice SDK...');
      
      // Get access token from our API
      const tokenResponse = await fetch(getApiUrl('/twilio-token'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: 'sales-agent-user' })
      });

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to get access token');
      }

      const { token } = await tokenResponse.json();
      envLog('Received Twilio access token');

      // Initialize Twilio Device
      const newDevice = new Device(token, {
        logLevel: ENV.IS_PRODUCTION ? 'error' : 'debug'
      });

      // Set up event listeners
      newDevice.on('ready', () => {
        envLog('Twilio Device ready');
        setIsReady(true);
        setError('');
      });

      newDevice.on('error', (error) => {
        console.error('Twilio Device error:', error);
        const errorMessage = `Twilio error: ${error.message}`;
        setError(errorMessage);
        onError?.(errorMessage);
      });

      newDevice.on('incoming', (call) => {
        envLog('Incoming call received');
        // Handle incoming call if needed
      });

      // Register the device
      await newDevice.register();
      setDevice(newDevice);

    } catch (error) {
      console.error('Failed to initialize Twilio:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setError(`Setup failed: ${errorMessage}`);
      onError?.(errorMessage);
    }
  };

  const makeCall = async () => {
    if (!device || !phoneNumber.trim()) return;

    try {
      setIsConnecting(true);
      setError('');

      envLog('Making call to:', phoneNumber);

      const call = await device.connect({
        params: { To: phoneNumber }
      });

      setCurrentCall(call);

      call.on('accept', () => {
        envLog('Call accepted');
        onCallStart?.(call.parameters.CallSid);
      });

      call.on('disconnect', () => {
        envLog('Call ended');
        // Calculate duration from call start time if available
        const duration = 0; // Duration tracking would need to be implemented separately
        onCallEnd?.(call.parameters.CallSid, duration);
        setCurrentCall(null);
        setIsConnecting(false);
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setError(`Call failed: ${error.message}`);
        setCurrentCall(null);
        setIsConnecting(false);
      });

    } catch (error) {
      console.error('Failed to make call:', error);
      setError(error instanceof Error ? error.message : 'Call failed');
      setIsConnecting(false);
    }
  };

  const hangUp = () => {
    if (currentCall) {
      currentCall.disconnect();
    }
  };

  const isInCall = currentCall && currentCall.status() === 'open';

  return (
    <div className="twilio-integration" style={{ padding: '20px', border: '1px solid #ddd', borderRadius: '8px', margin: '10px 0' }}>
      <h3>📞 Twilio Voice Calling</h3>
      
      {error && (
        <div style={{ color: 'red', marginBottom: '10px', padding: '10px', backgroundColor: '#ffebee', borderRadius: '4px' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {
          !isReady ? '🔄 Connecting...' :
          isInCall ? '📞 In Call' :
          isConnecting ? '☎️ Calling...' :
          '✅ Ready'
        }
      </div>

      {ENV.IS_NETLIFY && (
        <div style={{ backgroundColor: '#e8f5e8', padding: '10px', borderRadius: '4px', marginBottom: '10px' }}>
          🚀 Running on Netlify - Production calling enabled
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <input
          type="tel"
          placeholder="Enter phone number (e.g., +1234567890)"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          style={{
            width: '200px',
            padding: '8px',
            marginRight: '10px',
            border: '1px solid #ccc',
            borderRadius: '4px'
          }}
          disabled={!isReady || isConnecting}
        />
        
        {!isInCall ? (
          <button
            onClick={makeCall}
            disabled={!isReady || !phoneNumber.trim() || isConnecting}
            style={{
              padding: '8px 16px',
              backgroundColor: isReady && phoneNumber.trim() ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isReady && phoneNumber.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            {isConnecting ? '☎️ Calling...' : '📞 Call'}
          </button>
        ) : (
          <button
            onClick={hangUp}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            📞 Hang Up
          </button>
        )}
      </div>

      <div style={{ fontSize: '14px', color: '#666' }}>
        <p>📋 <strong>Instructions:</strong></p>
        <ul style={{ marginLeft: '20px' }}>
          <li>Enter a phone number in international format (e.g., +1234567890)</li>
          <li>Click "Call" to initiate the call</li>
          <li>Calls are automatically recorded and transcribed</li>
          <li>Use "Hang Up" to end the call</li>
        </ul>
      </div>
      
      {!ENV.IS_PRODUCTION && (
        <div style={{ backgroundColor: '#fff3cd', padding: '10px', borderRadius: '4px', marginTop: '10px' }}>
          ⚠️ <strong>Development Mode:</strong> Make sure your Twilio credentials are configured
        </div>
      )}
    </div>
  );
};

export default TwilioIntegration; 