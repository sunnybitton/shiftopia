import React from 'react';
import './ListView.css';

const ListView = ({ scheduleData, view, currentDate }) => {
  const getStationClass = (station) => {
    if (station.includes('תורן')) return 'duty-officer';
    if (station.includes('אחרי תורנות')) return 'after-duty';
    if (station.includes('חופש')) return 'vacation';
    return '';
  };

  const getDaysInWeek = (date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay()); // Start from Sunday
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const month = months[date.getMonth()];
    return `${dayName}, ${month} ${dayNum}`;
  };

  const renderShifts = (date) => {
    const dayData = scheduleData[date.getDate()];
    if (!dayData || dayData.length === 0) {
      return <div className="no-shift">No shift</div>;
    }

    return dayData.map((station, index) => (
      <div 
        key={index} 
        className={`shift-item ${getStationClass(station)}`}
      >
        {station}
      </div>
    ));
  };

  const renderWeeklyView = () => {
    const weekDays = getDaysInWeek(currentDate);
    
    return (
      <div className="weekly-view">
        {weekDays.map((day, index) => (
          <div 
            key={index} 
            className={`day-card ${day.getDate() === currentDate.getDate() ? 'current-day' : ''}`}
          >
            <div className="date-header">
              <span className="day-name">{formatDate(day)}</span>
            </div>
            <div className="shifts-container">
              {renderShifts(day)}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDailyView = () => {
    return (
      <div className="daily-view">
        <div className="day-card current-day">
          <div className="date-header">
            <span className="day-name">{formatDate(currentDate)}</span>
          </div>
          <div className="shifts-container">
            {renderShifts(currentDate)}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="list-view">
      {view === 'weekly' ? renderWeeklyView() : renderDailyView()}
    </div>
  );
};

export default ListView;