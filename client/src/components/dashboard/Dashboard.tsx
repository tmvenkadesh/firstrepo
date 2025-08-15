import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './Dashboard.css';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const handleStartEvaluation = () => {
    // This will be implemented in the evaluation task
    alert('Start evaluation feature will be implemented in the next task!');
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <h1>Developer Evaluation Dashboard</h1>
          <div className="user-info">
            <span>Welcome, {user?.name}</span>
            <button onClick={handleLogout} className="logout-button">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="dashboard-content">
          <div className="welcome-section">
            <h2>Welcome to Online Evaluation Tools</h2>
            <p>Test your technical knowledge with our comprehensive evaluation system.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Attempts</h3>
              <div className="stat-value">{user?.stats.totalAttempts || 0}</div>
            </div>
            <div className="stat-card">
              <h3>Average Score</h3>
              <div className="stat-value">{user?.stats.averageScore || 0}%</div>
            </div>
            <div className="stat-card">
              <h3>Best Score</h3>
              <div className="stat-value">{user?.stats.bestScore || 0}%</div>
            </div>
            <div className="stat-card">
              <h3>Time Spent</h3>
              <div className="stat-value">{Math.round((user?.stats.totalTimeSpent || 0) / 60)} min</div>
            </div>
          </div>

          <div className="action-section">
            <div className="action-card">
              <h3>Start New Evaluation</h3>
              <p>Begin a new technical assessment with randomized questions.</p>
              <button 
                onClick={handleStartEvaluation}
                className="primary-button"
              >
                Start Evaluation
              </button>
            </div>

            <div className="action-card">
              <h3>View History</h3>
              <p>Review your previous evaluation attempts and results.</p>
              <button 
                onClick={() => alert('History feature will be implemented!')}
                className="secondary-button"
              >
                View History
              </button>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="admin-section">
              <h3>Admin Panel</h3>
              <p>Manage questions, view reports, and configure system settings.</p>
              <button 
                onClick={() => alert('Admin panel will be implemented!')}
                className="admin-button"
              >
                Open Admin Panel
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;