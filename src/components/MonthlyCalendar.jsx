import React from 'react';
import './MonthlyCalendar.css';

const MonthlyCalendar = ({ month, year, scheduleData }) => {
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
    const days = [];
    const today = new Date();
    const isCurrentMonth = today.getMonth() + 1 === month && today.getFullYear() === year;

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday = isCurrentMonth && today.getDate() === day;
      const shifts = scheduleData[day] || [];

      days.push(
        <div 
          key={day} 
          className={`calendar-day ${isToday ? 'today' : ''} ${shifts.length > 0 ? 'has-shifts' : ''}`}
        >
          <div className="day-number">{day}</div>
          <div className="shifts-list">
            {shifts.map((shift, index) => (
              <div 
                key={index} 
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

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="monthly-calendar">
      <div className="calendar-header">
        {weekDays.map(day => (
          <div key={day} className="weekday-header">
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