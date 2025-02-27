import React, { useState, useEffect } from 'react';
import './MonthlyCalendar.css';

const MonthlyCalendar = ({ month, year, scheduleData }) => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getStationClass = (station) => {
    if (station.includes('תורן')) return 'duty-officer';
    if (station.includes('אחרי תורנות')) return 'after-duty';
    if (station.includes('חופש')) return 'vacation';
    return '';
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(month, year);
    const firstDay = getFirstDayOfMonth(month, year);
    const totalDays = firstDay + daysInMonth;
    const totalWeeks = Math.ceil(totalDays / 7);
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

    // Create a grid with exactly the right number of cells
    for (let i = 0; i < totalWeeks * 7; i++) {
      const dayNumber = i - firstDay + 1;
      const isValidDay = dayNumber > 0 && dayNumber <= daysInMonth;

      if (!isValidDay) {
        days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        continue;
      }

      const isToday = isCurrentMonth && today.getDate() === dayNumber;
      const shifts = scheduleData[dayNumber] || [];

      days.push(
        <div 
          key={`day-${dayNumber}`}
          className={`calendar-day ${isToday ? 'today' : ''} ${shifts.length > 0 ? 'has-shifts' : ''}`}
        >
          <div className="day-number">{dayNumber}</div>
          <div className="shifts-list">
            {shifts.map((shift, index) => (
              <div 
                key={`${dayNumber}-${index}`}
                className={`shift-tag ${getStationClass(shift)}`}
                title={shift}
              >
                {shift}
              </div>
            ))}
          </div>
        </div>
      );
    }

    return days;
  };

  const weekDays = {
    full: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    short: ['S', 'M', 'T', 'W', 'T', 'F', 'S']
  };

  return (
    <div className="monthly-calendar">
      <div className="calendar-header">
        {(isMobile ? weekDays.short : weekDays.full).map((day, index) => (
          <div key={`header-${day}-${index}`} className="weekday-header">
            {day}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {renderCalendar()}
      </div>
    </div>
  );
};

export default MonthlyCalendar; 