import React, { useState, useEffect, useCallback } from 'react';
import WorksheetCell from './WorksheetCell';
import './WorksheetTable.css';

const WorksheetTable = ({ 
  month, 
  year, 
  workstations = [],
  entries = [],
  onCellUpdate,
  isEditable = false
}) => {
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [stationConfigs, setStationConfigs] = useState([]);
  const [localEntries, setLocalEntries] = useState({});
  const hebrewWeekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];

  // Initialize local entries from props
  useEffect(() => {
    const initialEntries = Array.isArray(entries) ? entries.reduce((acc, entry) => {
      if (entry && entry.day && entry.workstation) {
        const key = `${entry.day}-${entry.workstation}`;
        acc[key] = entry.employee_assigned || '';
      }
      return acc;
    }, {}) : {};
    setLocalEntries(initialEntries);
  }, [entries]);

  // Fetch available employees and station configurations when component mounts
  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      try {
        // Fetch employees
        const employeesResponse = await fetch(`${import.meta.env.VITE_API_URL}/employees`);
        if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
        const employeesData = await employeesResponse.json();

        // Fetch station configurations
        const stationsResponse = await fetch(`${import.meta.env.VITE_API_URL}/stations`);
        if (!stationsResponse.ok) throw new Error('Failed to fetch stations');
        const stationsData = await stationsResponse.json();
        
        if (isMounted) {
          // Process employees data
          const employees = employeesData
            .filter(user => user?.username)
            .map(user => ({
              id: user.id,
              name: user.username || user.name,
              username: user.username || user.name,
              certifications: user.certifications || []
            }));
          
          setAvailableEmployees(employees);
          setStationConfigs(stationsData);
        }
      } catch (err) {
        console.error('Error fetching data:', err);
        if (isMounted) {
          setAvailableEmployees([]);
          setStationConfigs([]);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Get station color from configurations
  const getStationColor = useCallback((stationName) => {
    const station = stationConfigs.find(s => s.name === stationName);
    return station?.attributes?.color || '#FFFFFF';
  }, [stationConfigs]);

  // Handle cell updates
  const handleCellUpdate = useCallback(async (day, station, value) => {
    const key = `${day}-${station}`;
    
    try {
      // Update local state optimistically
      setLocalEntries(prev => ({
        ...prev,
        [key]: value
      }));

      // Call the parent's update function
      await onCellUpdate(day, station, value);
    } catch (error) {
      console.error('Failed to update cell:', error);
      // Revert local state if the server update fails
      setLocalEntries(prev => ({
        ...prev,
        [key]: entries.find(e => e.day === day && e.workstation === station)?.employee_assigned || ''
      }));
      throw error;
    }
  }, [onCellUpdate, entries]);

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
              <th 
                key={station}
                style={{ backgroundColor: getStationColor(station) }}
              >
                {station}
              </th>
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
                <td 
                  key={`${day}-${station}`}
                  style={{ backgroundColor: getStationColor(station) }}
                >
                  <WorksheetCell
                    day={day}
                    station={station}
                    value={localEntries[`${day}-${station}`] || ''}
                    onChange={handleCellUpdate}
                    isEditable={isEditable}
                    availableEmployees={availableEmployees}
                    stations={stationConfigs}
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