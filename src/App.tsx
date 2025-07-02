import React, { useState, useEffect } from 'react';
import './App.css';
import CallRecorder from './components/CallRecorder';
import CallHistory from './components/CallHistory';
import InstallPrompt from './components/InstallPrompt';

// Pure data interface - minimal, focused
interface CallData {
  id: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
  transcript?: string;
  leadScore?: number;
}

// Pure state interface - single responsibility
interface AppState {
  calls: CallData[];
  isRecording: boolean;
  currentView: 'record' | 'history';
}

// Pure function for initial state
const createInitialState = (): AppState => ({
  calls: [],
  isRecording: false,
  currentView: 'record'
});

// Pure function for loading saved calls
const loadSavedCalls = (): CallData[] => {
  try {
    const saved = localStorage.getItem('salesCalls');
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
};

// Pure function for saving calls
const saveCalls = (calls: CallData[]): void => {
  localStorage.setItem('salesCalls', JSON.stringify(calls));
};

function App() {
  const [state, setState] = useState<AppState>(createInitialState);

  // Load calls on mount - single effect
  useEffect(() => {
    setState(prev => ({
      ...prev,
      calls: loadSavedCalls()
    }));
  }, []);

  // Save calls when they change - pure side effect
  useEffect(() => {
    if (state.calls.length > 0) {
      saveCalls(state.calls);
    }
  }, [state.calls]);

  // Pure function handlers
  const addCall = (newCall: CallData): void => {
    setState(prev => ({
      ...prev,
      calls: [newCall, ...prev.calls]
    }));
  };

  const setRecording = (isRecording: boolean): void => {
    setState(prev => ({ ...prev, isRecording }));
  };

  const setView = (currentView: 'record' | 'history'): void => {
    setState(prev => ({ ...prev, currentView }));
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📞 Sales Call Recorder</h1>
        <div className="status-indicator">
          {state.isRecording && <span className="recording-pulse">🔴 Recording</span>}
        </div>
      </header>

      <InstallPrompt />

      {/* Minimal navigation - binary choice */}
      <nav className="simple-nav">
        <button 
          className={`nav-btn ${state.currentView === 'record' ? 'active' : ''}`}
          onClick={() => setView('record')}
        >
          🎙️ Record
        </button>
        <button 
          className={`nav-btn ${state.currentView === 'history' ? 'active' : ''}`}
          onClick={() => setView('history')}
        >
          📋 History ({state.calls.length})
        </button>
      </nav>

      {/* Pure component rendering - single responsibility */}
      <main className="app-main">
        {state.currentView === 'record' ? (
          <CallRecorder 
            onCallComplete={addCall} 
            isRecording={state.isRecording}
            setIsRecording={setRecording}
          />
        ) : (
          <CallHistory calls={state.calls} />
        )}
      </main>
    </div>
  );
}

export default App;
