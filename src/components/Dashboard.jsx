import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : 'Guest';

  return (
    <div className="dashboard">
      <h2 className="greeting">Hello, {fullName}</h2>
      <h1>Welcome to Shiftopia</h1>
      <p>Your one-stop solution for shift management</p>
    </div>
  );
};

export default Dashboard; 