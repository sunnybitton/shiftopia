import React from 'react';
import DailyScheduleCard from './DailyScheduleCard';
import './Dashboard.css';

const Dashboard = () => {
  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const fullName = user.firstName && user.lastName 
    ? `${user.firstName} ${user.lastName}`
    : 'Guest';

  // Get today's and tomorrow's dates
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="dashboard">
      <h2 className="greeting">Hello, {fullName}</h2>
      <h1>Welcome to Shiftopia</h1>
      <p>Your one-stop solution for shift management</p>
      
      <div className="daily-schedules">
        <DailyScheduleCard 
          date={today}
          title="Today's Schedule"
        />
        <DailyScheduleCard 
          date={tomorrow}
          title="Tomorrow's Schedule"
        />
      </div>
    </div>
  );
};

export default Dashboard; 