import React from 'react';
import { fetchSheetData } from '../services/sheetsService';
import Loading from './Loading';
import './DailyScheduleCard.css';

const DailyScheduleCard = ({ date, title }) => {
  const [schedule, setSchedule] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  React.useEffect(() => {
    const loadSchedule = async () => {
      try {
        setLoading(true);
        const monthNumber = date.getMonth() + 1;
        const year = date.getFullYear();
        const sheetName = `${monthNumber}-${year}`;
        
        const data = await fetchSheetData(sheetName);
        
        if (!data || data.length < 6) {
          throw new Error('No schedule data available');
        }

        const stationNames = data[3] || [];
        const dayNumber = date.getDate();
        const dayRow = data[dayNumber + 4];
        
        if (!dayRow) {
          throw new Error('No data for selected date');
        }

        // Find the user's assignments for this day
        const assignments = [];
        stationNames.forEach((station, index) => {
          if (dayRow[index] === user.firstName) {
            assignments.push(station);
          }
        });

        setSchedule(assignments);
        setError(null);
      } catch (err) {
        console.error('Error loading schedule:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSchedule();
  }, [date]);

  const getStationClass = (station) => {
    if (station.includes('תורן')) return 'duty-officer';
    if (station.includes('אחרי תורנות')) return 'after-duty';
    if (station.includes('חופש')) return 'vacation';
    return '';
  };

  if (loading) {
    return (
      <div className="daily-schedule-card loading">
        <h3>{title}</h3>
        <Loading size={80} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="daily-schedule-card error">
        <h3>{title}</h3>
        <div className="error-text">{error}</div>
      </div>
    );
  }

  return (
    <div className="daily-schedule-card">
      <h3>{title}</h3>
      <div className="schedule-content">
        {schedule && schedule.length > 0 ? (
          <div className="assignments">
            {schedule.map((station, index) => (
              <div 
                key={index}
                className={`assignment-tag ${getStationClass(station)}`}
              >
                {station}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-assignments">No assignments</div>
        )}
      </div>
    </div>
  );
};

export default DailyScheduleCard; 