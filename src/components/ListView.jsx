import React from 'react';
import './ListView.css';

const ListView = ({ scheduleData, view, currentDate }) => {
  const getStationClass = (station) => {
    if (station.includes('תורן')) return 'duty-officer';
    if (station.includes('אחרי תורנות')) return 'after-duty';
    if (station.includes('חופש')) return 'vacation';
    return '';
  };

  const getWeekDates = () => {
    const curr = new Date(currentDate);
    const week = [];
    curr.setDate(curr.getDate() - curr.getDay() + 1);
    
    for (let i = 0; i < 7; i++) {
      week.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }
    return week;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (view === 'weekly') {
    const weekDates = getWeekDates();
    return (
      <div className="list-view weekly-grid">
        <div className="week-header">
          {weekDates.map((date) => (
            <div key={date.toISOString()} className="day-header">
              {formatDate(date)}
            </div>
          ))}
        </div>
        <div className="week-content">
          {weekDates.map((date) => {
            const dayNumber = date.getDate();
            const stations = scheduleData[dayNumber] || [];
            
            return (
              <div key={date.toISOString()} className="day-column">
                {stations.length > 0 ? (
                  <div className="stations-list-column">
                    {stations.map((station, idx) => (
                      <span 
                        key={idx} 
                        className={`station-tag ${getStationClass(station)}`}
                      >
                        {station}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="no-shift">No shift</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  if (view === 'daily') {
    const today = currentDate.getDate();
    const stations = scheduleData[today] || [];
    
    return (
      <div className="list-view daily">
        <h3>{formatDate(currentDate)}</h3>
        {stations.length > 0 ? (
          <div className="stations-list">
            {stations.map((station, idx) => (
              <span 
                key={idx} 
                className={`station-tag ${getStationClass(station)}`}
              >
                {station}
              </span>
            ))}
          </div>
        ) : (
          <div className="no-shift">No shift scheduled for today</div>
        )}
      </div>
    );
  }

  return null;
};

export default ListView;