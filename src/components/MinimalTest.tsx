import React, { useState } from 'react';
import { Device } from '@twilio/voice-sdk';

const MinimalTest: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [device, setDevice] = useState<Device | null>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type.toUpperCase()}: ${message}`;
    setLogs(prev => [...prev, logEntry]);
    console.log(logEntry);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const testToken = async (): Promise<string> => {
    addLog('🧪 Testing token generation...', 'info');
    
    try {
      const response = await fetch('/.netlify/functions/twilio-token-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: `minimal_test_${Date.now()}` })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      addLog('✅ Token generation successful!', 'success');
      addLog(`Token length: ${data.token.length}`, 'info');
      addLog(`App SID: ${data.debug.payloadAppSid}`, 'info');
      addLog(`Issuer: ${data.debug.payloadIss}`, 'info');
      addLog(`Subject: ${data.debug.payloadSub}`, 'info');
      
      return data.token;
      
    } catch (error: any) {
      addLog(`❌ Token generation failed: ${error.message}`, 'error');
      throw error;
    }
  };

  const testDevice = async () => {
    addLog('📱 Testing Twilio Device registration (React version)...', 'info');
    
    try {
      // Clean up existing device
      if (device) {
        addLog('🧹 Cleaning up existing device...', 'info');
        device.destroy();
        setDevice(null);
      }
      
      // Get fresh token
      const token = await testToken();
      
      addLog('🔧 Creating new Twilio Device with React SDK...', 'info');
      
      // Create device with minimal options
      const newDevice = new Device(token, {
        logLevel: 'debug',
        edge: 'ashburn'
      });
      
      // Add event listeners
      newDevice.on('registered', () => {
        addLog('🎉 SUCCESS! Device registered successfully!', 'success');
      });
      
      newDevice.on('error', (error: any) => {
        addLog(`❌ Device error: ${error.message}`, 'error');
        addLog(`Error code: ${error.code}`, 'error');
        addLog(`Error name: ${error.name}`, 'error');
        if (error.twilioError) {
          addLog(`Twilio error: ${JSON.stringify(error.twilioError, null, 2)}`, 'error');
        }
      });
      
      newDevice.on('unregistered', () => {
        addLog('📴 Device unregistered', 'info');
      });
      
      newDevice.on('registering', () => {
        addLog('🔄 Device registering...', 'info');
      });
      
      setDevice(newDevice);
      
      // Attempt registration
      addLog('🚀 Starting device registration...', 'info');
      await newDevice.register();
      
    } catch (error: any) {
      addLog(`❌ Device test failed: ${error.message}`, 'error');
      addLog(`Error stack: ${error.stack}`, 'error');
    }
  };

  const testWithDifferentEdge = async () => {
    addLog('🌍 Testing with different edge locations...', 'info');
    
    const edges = ['sydney', 'dublin', 'singapore', 'tokyo'];
    
    for (const edge of edges) {
      try {
        addLog(`🔄 Testing edge: ${edge}`, 'info');
        
        const token = await testToken();
        
        const testDevice = new Device(token, {
          logLevel: 'debug',
          edge: edge
        });
        
        testDevice.on('registered', () => {
          addLog(`🎉 SUCCESS with edge ${edge}!`, 'success');
        });
        
        testDevice.on('error', (error: any) => {
          addLog(`❌ Edge ${edge} failed: ${error.message}`, 'error');
        });
        
        await testDevice.register();
        
        // Wait a bit then clean up
        setTimeout(() => {
          testDevice.destroy();
        }, 2000);
        
        break; // If successful, stop testing other edges
        
      } catch (error: any) {
        addLog(`❌ Edge ${edge} failed: ${error.message}`, 'error');
      }
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>🔧 Minimal Twilio Test (React)</h2>
      <p>This tests the Twilio Voice SDK using the exact same React environment as your main app.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testToken}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🧪 Test Token
        </button>
        <button 
          onClick={testDevice}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          📱 Test Device
        </button>
        <button 
          onClick={testWithDifferentEdge}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#ffc107', color: 'black', border: 'none', borderRadius: '4px' }}
        >
          🌍 Test Different Edges
        </button>
        <button 
          onClick={clearLogs}
          style={{ padding: '10px 20px', margin: '5px', backgroundColor: '#6c757d', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          🧹 Clear Logs
        </button>
      </div>

      <div style={{ 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6', 
        borderRadius: '4px', 
        padding: '15px', 
        maxHeight: '400px', 
        overflowY: 'auto'
      }}>
        <h4>Test Logs:</h4>
        {logs.length === 0 ? (
          <p style={{ color: '#6c757d' }}>No logs yet. Click a test button above.</p>
        ) : (
          logs.map((log, index) => (
            <div 
              key={index} 
              style={{ 
                fontFamily: 'monospace', 
                fontSize: '12px', 
                marginBottom: '5px',
                color: log.includes('ERROR') ? '#dc3545' : log.includes('SUCCESS') ? '#28a745' : '#495057'
              }}
            >
              {log}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MinimalTest; 