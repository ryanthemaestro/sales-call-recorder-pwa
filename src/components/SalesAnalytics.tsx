import React from 'react';

interface CallData {
  id: string;
  timestamp: string;
  duration: number;
  phoneNumber?: string;
  audioUrl?: string;
  analysis?: {
    transcript: string;
    summary: string;
    leadScore: number;
    actionItems: string[];
  };
}

interface SalesAnalyticsProps {
  calls: CallData[];
}

const SalesAnalytics: React.FC<SalesAnalyticsProps> = ({ calls }) => {
  const calculateStats = () => {
    const totalCalls = calls.length;
    const totalDuration = calls.reduce((sum, call) => sum + call.duration, 0);
    const avgDuration = totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0;
    const avgLeadScore = calls.filter(call => call.analysis?.leadScore).length > 0 
      ? calls.reduce((sum, call) => sum + (call.analysis?.leadScore || 0), 0) / calls.filter(call => call.analysis?.leadScore).length
      : 0;

    return {
      totalCalls,
      totalDuration,
      avgDuration,
      avgLeadScore: Math.round(avgLeadScore * 10) / 10,
      todayCalls: calls.filter(call => {
        const today = new Date().toDateString();
        return new Date(call.timestamp).toDateString() === today;
      }).length
    };
  };

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const stats = calculateStats();

  return (
    <div className="sales-analytics">
      <div className="analytics-header">
        <h2>📊 Sales Analytics</h2>
        <p>Call performance insights</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📞</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalCalls}</div>
            <div className="stat-label">Total Calls</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-value">{stats.todayCalls}</div>
            <div className="stat-label">Today's Calls</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏱️</div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.totalDuration)}</div>
            <div className="stat-label">Total Duration</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏰</div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.avgDuration)}</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
      </div>

      {calls.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">📈</div>
          <h3>No calls recorded yet</h3>
          <p>Start making calls to see your analytics here</p>
        </div>
      )}
    </div>
  );
};

export default SalesAnalytics; 