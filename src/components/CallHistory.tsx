import React, { useState, useEffect } from 'react';

// Pure interfaces
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

interface CallHistoryProps {
  calls?: CallData[];
}

// Pure utility functions
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatDate = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getLeadScoreColor = (score?: number): string => {
  if (!score) return 'var(--gray-400)';
  if (score >= 80) return 'var(--success)';
  if (score >= 60) return 'var(--warning)';
  return 'var(--error)';
};

const getLeadScoreLabel = (score?: number): string => {
  if (!score) return 'Not scored';
  if (score >= 80) return 'Hot';
  if (score >= 60) return 'Warm';
  return 'Cold';
};

// Generate sample data for demo (only when no real calls exist)
const generateSampleCalls = (): CallData[] => [
  {
    id: 'sample_001',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    duration: 1247,
    customerName: 'John Smith (Demo)',
    callType: 'Discovery',
    leadScore: 85,
    transcript: 'This is sample demo data. Record your first call to see real data here.'
  },
  {
    id: 'sample_002', 
    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    duration: 892,
    customerName: 'Sarah Johnson (Demo)',
    callType: 'Follow-up',
    leadScore: 72,
    transcript: 'Demo data showing how call history will look with your recordings.'
  }
];

const CallHistory: React.FC<CallHistoryProps> = ({ calls: propCalls }) => {
  const [calls, setCalls] = useState<CallData[]>([]);
  const [filter, setFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');

  useEffect(() => {
    // Always use the calls passed from props (which come from App component's state)
    if (propCalls && propCalls.length > 0) {
      setCalls(propCalls);
    } else {
      // Only show sample data if no real calls exist
      setCalls(generateSampleCalls());
    }
  }, [propCalls]);

  // Filter calls
  const filterCalls = (callsList: CallData[], filterType: string): CallData[] => {
    switch (filterType) {
      case 'hot':
        return callsList.filter(call => (call.leadScore || 0) >= 80);
      case 'warm':
        return callsList.filter(call => (call.leadScore || 0) >= 60 && (call.leadScore || 0) < 80);
      case 'cold':
        return callsList.filter(call => (call.leadScore || 0) < 60);
      default:
        return callsList;
    }
  };

  const processedCalls = filterCalls(calls, filter);
  const hasRealCalls = propCalls && propCalls.length > 0;

  const renderFilters = () => (
    <div style={{ 
      display: 'flex', 
      gap: '0.5rem', 
      marginBottom: '1.5rem',
      flexWrap: 'wrap'
    }}>
      <button
        className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFilter('all')}
      >
        All ({calls.length})
      </button>
      <button
        className={`btn ${filter === 'hot' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFilter('hot')}
      >
        Hot ({filterCalls(calls, 'hot').length})
      </button>
      <button
        className={`btn ${filter === 'warm' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFilter('warm')}
      >
        Warm ({filterCalls(calls, 'warm').length})
      </button>
      <button
        className={`btn ${filter === 'cold' ? 'btn-primary' : 'btn-secondary'}`}
        onClick={() => setFilter('cold')}
      >
        Cold ({filterCalls(calls, 'cold').length})
      </button>
    </div>
  );

  const renderCallCard = (call: CallData) => (
    <div key={call.id} className="call-item">
      <div className="call-header">
        <div>
          <h3 className="call-title">
            {call.customerName || 'Unknown Customer'}
            {call.id.startsWith('sample_') && !hasRealCalls && (
              <span style={{ 
                fontSize: 'var(--text-sm)', 
                color: 'var(--gray-400)', 
                fontWeight: 'normal',
                marginLeft: '0.5rem'
              }}>
                (Sample)
              </span>
            )}
          </h3>
          <div className="call-meta">
            <span>{formatDate(call.timestamp)}</span>
            <span>{formatDuration(call.duration)}</span>
            <span>{call.callType}</span>
          </div>
        </div>
        
        {call.leadScore && (
          <div 
            className="status-indicator"
            style={{ 
              background: `${getLeadScoreColor(call.leadScore)}20`,
              color: getLeadScoreColor(call.leadScore),
              fontSize: 'var(--text-sm)'
            }}
          >
            {getLeadScoreLabel(call.leadScore)} ({call.leadScore}%)
          </div>
        )}
      </div>

      {call.transcript && (
        <div style={{ 
          marginTop: '0.75rem',
          padding: '0.75rem',
          background: 'var(--gray-100)',
          borderRadius: 'var(--radius)',
          fontSize: 'var(--text-sm)',
          color: 'var(--gray-700)',
          fontStyle: 'italic'
        }}>
          "{call.transcript}"
        </div>
      )}

      <div style={{ 
        display: 'flex', 
        gap: '0.5rem', 
        marginTop: '0.75rem',
        justifyContent: 'flex-end'
      }}>
        {call.audioUrl && (
          <button 
            className="btn btn-secondary"
            onClick={() => {
              const audio = new Audio(call.audioUrl);
              audio.play().catch(error => console.error('Playback failed:', error));
            }}
          >
            Play
          </button>
        )}
        <button className="btn btn-secondary">
          View
        </button>
      </div>
    </div>
  );

  const renderEmptyState = () => (
    <div style={{
      textAlign: 'center',
      padding: '3rem 1rem',
      color: 'var(--gray-500)'
    }}>
      <div style={{ 
        fontSize: '3rem', 
        marginBottom: '1rem',
        color: 'var(--gray-300)'
      }}>
        MIC
      </div>
      <h3 style={{ 
        fontSize: 'var(--text-lg)', 
        fontWeight: 600, 
        marginBottom: '0.5rem',
        color: 'var(--gray-700)'
      }}>
        No calls recorded yet
      </h3>
      <p style={{ fontSize: 'var(--text-base)', marginBottom: '1.5rem' }}>
        Start recording sales calls to see them here
      </p>
      <button 
        className="btn btn-primary"
        onClick={() => window.location.reload()}
      >
        Start Recording
      </button>
    </div>
  );

  const renderStats = () => {
    if (calls.length === 0) return null;
    
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    const avgScore = calls.length > 0 
      ? calls.reduce((sum, call) => sum + (call.leadScore || 0), 0) / calls.length 
      : 0;

    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          background: 'var(--gray-100)',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--gray-900)' }}>
            {calls.length}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
            Total Calls
          </div>
        </div>

        <div style={{
          background: 'var(--gray-100)',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--gray-900)' }}>
            {formatDuration(totalDuration)}
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
            Total Time
          </div>
        </div>

        <div style={{
          background: 'var(--gray-100)',
          padding: '1rem',
          borderRadius: 'var(--radius)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 'var(--text-xl)', fontWeight: 600, color: 'var(--gray-900)' }}>
            {Math.round(avgScore)}%
          </div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-600)' }}>
            Avg Score
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {!hasRealCalls && calls.length > 0 && (
        <div style={{
          background: 'var(--warning)',
          color: 'white',
          padding: 'var(--space-3)',
          borderRadius: 'var(--radius)',
          marginBottom: '1rem',
          fontSize: 'var(--text-sm)',
          textAlign: 'center'
        }}>
          Showing sample data - Record your first call to see real data here
        </div>
      )}
      
      {renderStats()}
      {calls.length > 0 && renderFilters()}
      
      {processedCalls.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="call-list">
          {processedCalls.map(renderCallCard)}
        </div>
      )}
    </div>
  );
};

export default CallHistory; 