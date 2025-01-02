import React from 'react';
import './MonthlyCalendar.css';

const MonthlyCalendar = ({ month, year, scheduleData }) => {
  // Add validation for inputs
  if (!month || !year || month < 1 || month > 12 || !scheduleData) {
    return <div>Invalid calendar data</div>;
  }

  try {
    // Get the first day of the month and total days
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = new Date(year, month, 0).getDate();

    // Validate totalDays
    if (isNaN(totalDays) || totalDays <= 0 || totalDays > 31) {
      return <div>Invalid date configuration</div>;
    }

    // Create array of days with schedule data
    const days = Array(totalDays).fill(null).map((_, index) => {
      const dayNumber = index + 1;
      return {
        day: dayNumber,
        stations: scheduleData[dayNumber] || []
      };
    });

    // Add empty cells for days before the first day of the month
    const blanks = Array(firstDay).fill(null);
    const allCells = [...blanks, ...days];

    // Split into weeks
    const weeks = [];
    let week = [];
    
    allCells.forEach((day, index) => {
      week.push(day);
      if (week.length === 7 || index === allCells.length - 1) {
        while (week.length < 7) {
          week.push(null);
        }
        weeks.push(week);
        week = [];
      }
    });

    const getStationClass = (station) => {
      if (station.includes('תורן')) return 'duty-officer';
      if (station.includes('אחרי תורנות')) return 'after-duty';
      if (station.includes('חופש')) return 'vacation';
      return '';
    };

    // Add function to check if a day is today
    const isToday = (dayNumber) => {
      const today = new Date();
      return today.getDate() === dayNumber && 
             today.getMonth() + 1 === month && 
             today.getFullYear() === year;
    };

    return (
      <div className="calendar">
        <div className="calendar-header">
          <div>Sun</div>
          <div>Mon</div>
          <div>Tue</div>
          <div>Wed</div>
          <div>Thu</div>
          <div>Fri</div>
          <div>Sat</div>
        </div>
        <div className="calendar-body">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="calendar-week">
              {week.map((day, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className={`calendar-day ${!day ? 'empty' : ''} ${day && isToday(day.day) ? 'today' : ''}`}
                >
                  {day && (
                    <>
                      <div className="day-number">{day.day}</div>
                      <div className="stations">
                        {day.stations.map((station, index) => (
                          <span 
                            key={index} 
                            className={`station-tag ${getStationClass(station)}`}
                          >
                            {station}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error('Error rendering calendar:', error);
    return <div>Error loading calendar</div>;
  }
};

export default MonthlyCalendar; 