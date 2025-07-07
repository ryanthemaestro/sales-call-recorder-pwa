import React, { useState, useEffect, useCallback } from 'react';
import { Device, Call } from '@twilio/voice-sdk';
import { getApiUrl, ENV, envLog, API_CONFIG } from '../utils/config';

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
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [status, setStatus] = useState('Initializing...');
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  // Generate a unique identity for this session
  const identity = `user_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  const isInCall = Boolean(currentCall && ((currentCall as any).status() === 'open' || (currentCall as any).status() === 'connecting'));
  const callDuration = (callStartTime !== null && isInCall) ? Math.floor((Date.now() - callStartTime) / 1000) : 0;

  // Debug function to decode and inspect JWT token
  const debugToken = (token: string) => {
    try {
      console.log('🔍 TOKEN DEBUG - Raw token length:', token.length);
      console.log('🔍 TOKEN DEBUG - Token starts with:', token.substring(0, 50) + '...');
      
      // Decode JWT header and payload
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.error('❌ TOKEN DEBUG - Invalid JWT format, expected 3 parts, got:', parts.length);
        return;
      }
      
      // Decode header
      const header = JSON.parse(atob(parts[0]));
      console.log('🔍 TOKEN DEBUG - JWT Header:', header);
      
      // Decode payload
      const payload = JSON.parse(atob(parts[1]));
      console.log('🔍 TOKEN DEBUG - JWT Payload:', payload);
      
      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      const exp = payload.exp;
      const iat = payload.iat;
      
      console.log('🔍 TOKEN DEBUG - Current time:', now, new Date(now * 1000));
      console.log('🔍 TOKEN DEBUG - Token issued at:', iat, new Date(iat * 1000));
      console.log('🔍 TOKEN DEBUG - Token expires at:', exp, new Date(exp * 1000));
      console.log('🔍 TOKEN DEBUG - Token valid for:', exp - now, 'seconds');
      
      if (exp < now) {
        console.error('❌ TOKEN DEBUG - Token is EXPIRED!');
      } else {
        console.log('✅ TOKEN DEBUG - Token is not expired');
      }
      
      // Check required fields
      const requiredFields = ['iss', 'sub', 'grants'];
      requiredFields.forEach(field => {
        if (!payload[field]) {
          console.error(`❌ TOKEN DEBUG - Missing required field: ${field}`);
        } else {
          console.log(`✅ TOKEN DEBUG - Found required field: ${field}`, payload[field]);
        }
      });
      
    } catch (error) {
      console.error('❌ TOKEN DEBUG - Error decoding token:', error);
    }
  };

  const fetchToken = useCallback(async () => {
    try {
      console.log('🔄 FETCH TOKEN - Starting token request...');
      
      // Generate a simple, clean identity
      const identity = `user${Date.now()}`;
      console.log('🔄 FETCH TOKEN - Using identity:', identity);
      console.log('🔄 FETCH TOKEN - Using endpoint: /.netlify/functions/twilio-token-final');
      
      const response = await fetch('/.netlify/functions/twilio-token-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ identity }),
        cache: 'no-store'
      });

      console.log('🔄 FETCH TOKEN - Response status:', response.status);
      console.log('🔄 FETCH TOKEN - Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ FETCH TOKEN - HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('🔄 FETCH TOKEN - Response data keys:', Object.keys(data));
      console.log('🔄 FETCH TOKEN - Full response:', data);

      if (!data.token) {
        console.error('❌ FETCH TOKEN - No token in response!');
        throw new Error('No token received from server');
      }

      console.log('✅ FETCH TOKEN - Token received successfully');
      
      // Debug the token
      debugToken(data.token);
      
      return data.token;
    } catch (error) {
      console.error('❌ FETCH TOKEN - Error:', error);
      throw error;
    }
  }, []);

  const setupDevice = useCallback(async () => {
    try {
      console.log('🔄 SETUP DEVICE - Starting device setup...');
      
      // Clean up existing device
      if (device) {
        console.log('🔄 SETUP DEVICE - Cleaning up existing device...');
        device.removeAllListeners();
        device.destroy();
        setDevice(null);
      }

      console.log('🔄 SETUP DEVICE - Fetching fresh token...');
      const token = await fetchToken();
      
      console.log('🔄 SETUP DEVICE - Creating new Device instance...');
      console.log('🔄 SETUP DEVICE - Device options:', {
        logLevel: 'debug'
      });
      
      // Add detailed token debugging before creating device
      console.log('🔍 PRE-DEVICE TOKEN DEBUG - Token being used:', token.substring(0, 50) + '...');
      const tokenParts = token.split('.');
      console.log('🔍 PRE-DEVICE TOKEN DEBUG - JWT parts count:', tokenParts.length);
      
      if (tokenParts.length === 3) {
        try {
          const header = JSON.parse(atob(tokenParts[0]));
          const payload = JSON.parse(atob(tokenParts[1]));
          console.log('🔍 PRE-DEVICE TOKEN DEBUG - Header alg:', header.alg);
          console.log('🔍 PRE-DEVICE TOKEN DEBUG - Payload iss:', payload.iss);
          console.log('🔍 PRE-DEVICE TOKEN DEBUG - Payload sub:', payload.sub);
          console.log('🔍 PRE-DEVICE TOKEN DEBUG - Payload identity:', payload.grants?.identity);
          console.log('🔍 PRE-DEVICE TOKEN DEBUG - Payload app_sid:', payload.grants?.voice?.outgoing?.application_sid);
        } catch (e) {
          console.error('🔍 PRE-DEVICE TOKEN DEBUG - Failed to parse token:', e);
        }
      }
      
      const newDevice = new Device(token, {
        logLevel: 'debug',
        edge: 'ashburn'  // Specify US East region explicitly
      });

      console.log('🔄 SETUP DEVICE - Device created, adding event listeners...');

      // Add comprehensive event listeners
      newDevice.on('registered', () => {
        console.log('✅ DEVICE EVENT - Device registered successfully');
        setIsReady(true);
        setStatus('✅ Ready to call');
        setError(null);
      });

      newDevice.on('registering', () => {
        console.log('🔄 DEVICE EVENT - Device registering...');
        setStatus('🔄 Connecting...');
      });

      newDevice.on('unregistered', () => {
        console.log('📴 DEVICE EVENT - Device unregistered');
        setIsReady(false);
        setStatus('📴 Disconnected');
      });

      newDevice.on('error', (error: any) => {
        console.error('❌ DEVICE EVENT - Device error:', error);
        console.error('❌ DEVICE EVENT - Error name:', error.name);
        console.error('❌ DEVICE EVENT - Error message:', error.message);
        console.error('❌ DEVICE EVENT - Error code:', error.code);
        console.error('❌ DEVICE EVENT - Error stack:', error.stack);
        
        setError(error.message);
        setStatus('❌ Error');
        onError?.(error.message);
      });

      newDevice.on('incoming', (call: Call) => {
        console.log('📞 DEVICE EVENT - Incoming call from:', call.parameters.From);
        setCurrentCall(call);
        
        // Auto-answer for demo purposes (remove in production)
        call.accept();
        setCallStartTime(Date.now());
        onCallStart?.(call.parameters.CallSid);
      });

      // Token refresh handling
      newDevice.on('tokenWillExpire', () => {
        console.log('⏰ DEVICE EVENT - Token will expire, refreshing...');
        refreshToken();
      });

      setDevice(newDevice);

      // Register the device
      console.log('🔄 DEVICE EVENT - Registering device...');
      await newDevice.register();

    } catch (error: any) {
      console.error('❌ SETUP DEVICE - Setup failed:', error);
      console.error('❌ SETUP DEVICE - Error name:', error?.name);
      console.error('❌ SETUP DEVICE - Error message:', error?.message);
      console.error('❌ SETUP DEVICE - Error stack:', error?.stack);
      
      setError(error?.message || 'Failed to initialize Twilio Device');
      onError?.(error?.message || 'Failed to initialize Twilio Device');
    }
  }, [identity, onError]); // Only depend on identity, which is stable

  const refreshToken = useCallback(async () => {
    try {
      console.log('🔄 REFRESH TOKEN - Refreshing token...');
      
      if (!device) {
        console.log('❌ REFRESH TOKEN - No device available');
        return;
      }

      const token = await fetchToken();
      console.log('🔄 REFRESH TOKEN - Updating device token...');
      
      device.updateToken(token);
      console.log('✅ REFRESH TOKEN - Token updated successfully');
      
    } catch (error) {
      console.error('❌ REFRESH TOKEN - Failed to refresh token:', error);
      setError('Failed to refresh token');
    }
  }, [device]);

  const initializeWithUserGesture = useCallback(async () => {
    try {
      // Resume AudioContext with user gesture
      if (typeof window !== 'undefined' && window.AudioContext) {
        const audioContext = new AudioContext();
        if (audioContext.state === 'suspended') {
          await audioContext.resume();
        }
        audioContext.close();
      }
      
      await setupDevice();
    } catch (error) {
      console.error('Failed to initialize with user gesture:', error);
      await setupDevice(); // Fallback to regular setup
    }
  }, [setupDevice]);

  const makeCall = useCallback(async () => {
    if (!device || !isReady || !phoneNumber.trim()) {
      const message = !device ? 'Device not initialized' : 
                     !isReady ? 'Device not ready' : 
                     'Please enter a phone number';
      setError(message);
      return;
    }

    try {
      setIsConnecting(true);
      setError(null);
      setStatus('📞 Calling...');

      console.log('📞 Making call to:', phoneNumber);

      const call = await device.connect({
        params: {
          To: phoneNumber.trim()
        }
      });

      setCurrentCall(call);
      setCallStartTime(Date.now());

      call.on('accept', () => {
        console.log('✅ Call accepted');
        setStatus('📞 Connected');
        onCallStart?.(call.parameters?.CallSid || 'unknown');
      });

      call.on('disconnect', () => {
        console.log('📴 Call disconnected');
        const duration = callStartTime ? Math.floor((Date.now() - callStartTime) / 1000) : 0;
        setCurrentCall(null);
        setCallStartTime(null);
        setIsConnecting(false);
        setStatus('✅ Ready to call');
        onCallEnd?.(call.parameters?.CallSid || 'unknown', duration);
      });

      call.on('error', (error: any) => {
        console.error('❌ Call error:', error);
        setCurrentCall(null);
        setCallStartTime(null);
        setIsConnecting(false);
        setStatus('❌ Call failed');
        setError(`Call failed: ${error.message || 'Unknown error'}`);
      });

    } catch (error: any) {
      console.error('❌ Call initiation failed:', error);
      setIsConnecting(false);
      setStatus('❌ Call failed');
      setError(`Failed to make call: ${error.message || 'Unknown error'}`);
    }
  }, [device, isReady, phoneNumber, callStartTime, onCallStart, onCallEnd]);

  const hangUp = useCallback(() => {
    if (currentCall) {
      console.log('📴 Hanging up call');
      currentCall.disconnect();
    }
  }, [currentCall]);

  const retrySetup = useCallback(() => {
    setError(null);
    setStatus('Retrying...');
    initializeWithUserGesture();
  }, [initializeWithUserGesture]);

  // Initialize only once on mount
  useEffect(() => {
    let mounted = true;
    
    const init = async () => {
      if (mounted) {
        setStatus('🔄 Click to initialize...');
      }
    };
    
    init();

    return () => {
      mounted = false;
      if (device) {
        console.log('🧹 Cleaning up device');
        device.destroy();
      }
    };
  }, []); // Empty dependency array - only run once

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '1px solid #ddd', 
      borderRadius: '8px', 
      maxWidth: '500px',
      margin: '20px auto',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h2 style={{ margin: '0 0 20px 0', textAlign: 'center' }}>
        🎙️ Twilio Voice Calling (SDK 2.14.0)
      </h2>

      <div style={{ marginBottom: '15px' }}>
        <strong>Status:</strong> <span style={{ 
          color: isReady ? 'green' : error ? 'red' : 'orange' 
        }}>
          {status}
        </span>
      </div>

      <div style={{ marginBottom: '15px' }}>
        <strong>Identity:</strong> {identity}
      </div>

      {isInCall && (
        <div style={{ marginBottom: '15px', color: 'blue' }}>
          <strong>Call Duration:</strong> {formatDuration(callDuration)}
        </div>
      )}

      {error && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#ffebee', 
          border: '1px solid #f44336',
          borderRadius: '4px',
          color: '#d32f2f'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={retrySetup}
            style={{ 
              marginLeft: '10px', 
              padding: '5px 10px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {debugInfo && (
        <div style={{ 
          marginBottom: '15px', 
          padding: '10px', 
          backgroundColor: '#fff3e0', 
          border: '1px solid #ff9800',
          borderRadius: '4px',
          fontSize: '12px'
        }}>
          <strong>Debug Info:</strong>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <div style={{ marginBottom: '15px' }}>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="Enter phone number (e.g., +1234567890)"
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '4px',
            boxSizing: 'border-box'
          }}
          disabled={!device || !isReady || isInCall}
        />
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        {!device ? (
          <button
            onClick={initializeWithUserGesture}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            🎙️ Initialize Voice
          </button>
        ) : !isInCall ? (
          <button
            onClick={makeCall}
            disabled={!isReady || !phoneNumber.trim() || isConnecting}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: isReady && phoneNumber.trim() ? '#4CAF50' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isReady && phoneNumber.trim() ? 'pointer' : 'not-allowed',
              fontSize: '16px'
            }}
          >
            {isConnecting ? '📞 Calling...' : '📞 Call'}
          </button>
        ) : (
          <button
            onClick={hangUp}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            📴 Hang Up
          </button>
        )}
      </div>

      <div style={{ marginTop: '15px', fontSize: '12px', color: '#666' }}>
        <strong>Environment:</strong> {ENV.IS_PRODUCTION ? 'Production' : 'Development'}<br/>
        <strong>API URL:</strong> {API_CONFIG.BASE_URL}<br/>
        <strong>SDK Version:</strong> 2.14.0 (2025)
      </div>
    </div>
  );
};

export default TwilioIntegration; 