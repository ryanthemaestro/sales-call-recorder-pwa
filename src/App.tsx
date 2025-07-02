import React, { useState, useEffect } from 'react';
import './App.css';
import CallRecorder from './components/CallRecorder';
import CallHistory from './components/CallHistory';
import InstallPrompt from './components/InstallPrompt';

// Call data interface
interface CallData {
  id: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
  transcript?: string;
  leadScore?: number;
  customerName?: string;
  callType?: string;
}

// Pure utility functions - minimal and focused
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const getStatusText = (isRecording: boolean, isProcessing: boolean): string => {
  if (isRecording) return 'Recording';
  if (isProcessing) return 'Processing';
  return 'Ready';
};

const getStatusClass = (isRecording: boolean, isProcessing: boolean): string => {
  if (isRecording) return 'status-recording';
  if (isProcessing) return 'status-processing';
  return 'status-ready';
};

// Generate a simple lead score for demo
const generateLeadScore = (duration: number): number => {
  // Simple algorithm: longer calls = higher scores
  if (duration > 900) return Math.floor(Math.random() * 20) + 80; // 80-100
  if (duration > 300) return Math.floor(Math.random() * 30) + 60; // 60-90
  return Math.floor(Math.random() * 40) + 40; // 40-80
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'record' | 'history'>('record');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [calls, setCalls] = useState<CallData[]>([]);

  // Load calls from localStorage on mount
  useEffect(() => {
    try {
      const savedCalls = localStorage.getItem('salesCalls');
      if (savedCalls) {
        setCalls(JSON.parse(savedCalls));
      }
    } catch (error) {
      console.error('Failed to load calls:', error);
    }
  }, []);

  // Save calls to localStorage when calls change
  useEffect(() => {
    try {
      localStorage.setItem('salesCalls', JSON.stringify(calls));
    } catch (error) {
      console.error('Failed to save calls:', error);
    }
  }, [calls]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRecording]);

  // Handle completed call
  const handleCallComplete = (audioUrl: string, duration: number) => {
    console.log('🎯 Call completed:', { audioUrl, duration });
    console.log('%c📞 CALL COMPLETION TRIGGERED!', 'background: green; color: white; font-size: 16px; padding: 5px;');
    alert(`Call completed! Duration: ${duration} seconds`);
    
    const newCall: CallData = {
      id: `call_${Date.now()}`,
      timestamp: new Date().toISOString(),
      duration,
      audioUrl,
      customerName: `Customer ${calls.length + 1}`,
      callType: 'Sales Call',
      leadScore: generateLeadScore(duration),
      transcript: `Call recording of ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')} completed successfully. Analysis pending...`
    };

    console.log('📞 Adding new call:', newCall);
    console.log('📋 Current calls before:', calls.length);

    setCalls(prevCalls => {
      const updatedCalls = [newCall, ...prevCalls];
      console.log('📋 Updated calls:', updatedCalls.length, updatedCalls);
      console.log('%c✅ CALLS STATE UPDATED!', 'background: blue; color: white; font-size: 16px; padding: 5px;');
      return updatedCalls;
    });
    
    // Auto-switch to history to show the new call
    setTimeout(() => {
      console.log('🔄 Switching to history view');
      console.log('%c🔄 SWITCHING TO HISTORY TAB!', 'background: purple; color: white; font-size: 16px; padding: 5px;');
      setCurrentView('history');
    }, 1000);
  };

  // PWA Install Detection
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      // Store the event for later use
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const renderHeader = () => (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">Sales Call Recorder</div>
        
        <div className="nav-buttons">
          <button 
            className={`nav-button ${currentView === 'record' ? 'active' : ''}`}
            onClick={() => setCurrentView('record')}
          >
            Record
          </button>
          <button 
            className={`nav-button ${currentView === 'history' ? 'active' : ''}`}
            onClick={() => setCurrentView('history')}
          >
            History ({calls.length})
          </button>
        </div>
      </div>
    </header>
  );

  const renderStatusBar = () => (
    <div className={`status-indicator ${getStatusClass(isRecording, isProcessing)}`}>
      <span>{getStatusText(isRecording, isProcessing)}</span>
      {isRecording && <span>{formatTime(recordingTime)}</span>}
    </div>
  );

  const renderMainContent = () => {
    switch (currentView) {
      case 'record':
        return (
          <div className="card">
            <div className="card-header">
              <h1 className="card-title">Record Sales Call</h1>
              <p className="card-subtitle">
                Capture and analyze your sales conversations
              </p>
              {renderStatusBar()}
            </div>
            
            <CallRecorder 
              isRecording={isRecording}
              isProcessing={isProcessing}
              onRecordingChange={setIsRecording}
              onProcessingChange={setIsProcessing}
              recordingTime={recordingTime}
              onCallComplete={handleCallComplete}
            />
          </div>
        );
        
      case 'history':
        return (
          <div className="card">
            <div className="card-header">
              <h1 className="card-title">Call History</h1>
              <p className="card-subtitle">
                Review your recorded calls
              </p>
            </div>
            
            <CallHistory calls={calls} />
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {renderHeader()}
      
      <main className="main-content">
        <InstallPrompt />
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;
