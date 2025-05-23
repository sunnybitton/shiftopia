import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePDF } from 'react-to-pdf';
import WorksheetCell from './WorksheetCell';
import './WorksheetTable.css';

const hebrewWeekdays = ['א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ש'];
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const WorksheetTable = ({ 
  month, 
  year, 
  workstations = [],
  entries = [],
  onCellUpdate,
  isEditable = false,
  onDownloadStart,
  onDownloadComplete
}, ref) => {
  const [availableEmployees, setAvailableEmployees] = useState([]);
  const [stationConfigs, setStationConfigs] = useState([]);
  const [localEntries, setLocalEntries] = useState({});
  const tableRef = useRef(null);
  const { toPDF } = usePDF({
    filename: `worksheet-${hebrewMonths[month-1]}-${year}.pdf`,
    page: {
      margin: 20,
      format: 'a3',
      orientation: 'landscape'
    }
  });

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

  // Handle PDF download
  const handleDownloadPDF = useCallback(async () => {
    try {
      if (onDownloadStart) {
        onDownloadStart();
      }

      if (!tableRef.current) {
        throw new Error('Table not ready for PDF generation');
      }

      const options = {
        filename: `worksheet-${hebrewMonths[month-1]}-${year}.pdf`,
        page: {
          margin: 20,
          format: 'a3',
          orientation: 'landscape'
        },
        method: 'save'
      };

      await toPDF(tableRef.current, options);
      
      if (onDownloadComplete) {
        onDownloadComplete();
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
      if (onDownloadComplete) {
        onDownloadComplete(error);
      }
    }
  }, [toPDF, month, year, onDownloadStart, onDownloadComplete]);

  // Expose the download function to parent
  React.useImperativeHandle(ref, () => ({
    downloadPDF: handleDownloadPDF
  }), [handleDownloadPDF]);

  return (
    <div className="worksheet-container">
      <div className="worksheet-header">
        <h2 className="worksheet-title">
          {`${hebrewMonths[month-1]} ${year}`}
        </h2>
      </div>
      <div className="worksheet-table-container" dir="rtl" ref={tableRef}>
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
    </div>
  );
};

export default React.forwardRef(WorksheetTable); 