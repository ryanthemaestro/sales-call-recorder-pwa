import React from 'react';

interface CallData {
  id: string;
  timestamp: string;
  duration: number;
  audioUrl?: string;
  transcript?: string;
  leadScore?: number;
}

interface CallHistoryProps {
  calls: CallData[];
}

// Pure function for formatting timestamp
const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// Pure function for formatting duration
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Pure function for lead score display
const getLeadScoreDisplay = (score?: number): string => {
  if (!score) return 'Not analyzed';
  return `${score}/10`;
};

const CallHistory: React.FC<CallHistoryProps> = ({ calls }) => {
  const playAudio = (audioUrl: string): void => {
    const audio = new Audio(audioUrl);
    audio.play().catch(error => console.error('Failed to play audio:', error));
  };

  const downloadAudio = (audioUrl: string, callId: string): void => {
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `call_${callId}.webm`;
    link.click();
  };

  if (calls.length === 0) {
    return (
      <div className="call-history">
        <h2>📋 Call History</h2>
        <div className="history-empty">
          <p>No calls recorded yet</p>
          <p>Start recording calls to see them here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="call-history">
      <h2>📋 Call History ({calls.length})</h2>
      {calls.map((call) => (
        <div key={call.id} className="call-item">
          <div className="call-info">
            <h3>Call #{call.id.slice(-8)}</h3>
            <div className="call-meta">
              <span>📅 {formatDate(call.timestamp)}</span>
              <span>⏱️ {formatDuration(call.duration)}</span>
              <span>📊 {getLeadScoreDisplay(call.leadScore)}</span>
            </div>
          </div>
          <div className="call-actions">
            {call.audioUrl && (
              <>
                <button 
                  className="action-btn"
                  onClick={() => playAudio(call.audioUrl!)}
                  title="Play recording"
                >
                  ▶️ Play
                </button>
                <button 
                  className="action-btn"
                  onClick={() => downloadAudio(call.audioUrl!, call.id)}
                  title="Download recording"
                >
                  ⬇️ Download
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default CallHistory; 