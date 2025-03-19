import React from 'react';
import './WorksheetTable.css';

const WorksheetTable = ({ 
  month, 
  year, 
  workstations = [],
  entries = [],
  onCellUpdate,
  isEditable = false
}) => {
  // Hebrew weekday letters
  const hebrewWeekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Get number of days in the selected month
  const daysInMonth = new Date(year, parseInt(month), 0).getDate();

  // Generate days array with weekday information
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, parseInt(month) - 1, i + 1);
    const dayOfWeek = date.getDay();
    return {
      day: i + 1,
      hebrewWeekday: hebrewWeekdays[dayOfWeek]
    };
  });

  // Create a map of entries for quick lookup, ensuring entries is an array
  const entryMap = Array.isArray(entries) ? entries.reduce((acc, entry) => {
    if (entry && entry.day && entry.workstation) {
      const key = `${entry.day}-${entry.workstation}`;
      acc[key] = entry.employee_assigned || '';
    }
    return acc;
  }, {}) : {};

  const handleCellEdit = (day, workstation, value) => {
    if (!isEditable) return;
    onCellUpdate?.(day, workstation, value);
  };

  // Ensure workstations is always an array
  const stationsInOrder = Array.isArray(workstations) ? workstations : [];

  return (
    <div className="worksheet-table-container" dir="rtl">
      <table className="worksheet-table">
        <thead>
          <tr>
            <th>תאריך</th>
            <th>יום</th>
            {stationsInOrder.map(station => (
              <th key={station}>{station}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {days.map(({ day, hebrewWeekday }) => (
            <tr key={day}>
              <td className="day-cell">{day}</td>
              <td className="weekday-cell">
                <span className="hebrew-letter">{hebrewWeekday}</span>
              </td>
              {stationsInOrder.map(station => (
                <td key={`${day}-${station}`}>
                  <input
                    type="text"
                    className="cell-input"
                    value={entryMap[`${day}-${station}`] || ''}
                    onChange={(e) => handleCellEdit(day, station, e.target.value)}
                    disabled={!isEditable}
                    aria-label={`Shift for ${station} on day ${day}`}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WorksheetTable; 