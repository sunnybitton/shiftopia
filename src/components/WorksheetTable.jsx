import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePDF } from 'react-to-pdf';
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
  const [selectedCell, setSelectedCell] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [zoomLevel, setZoomLevel] = useState(100);
  const tableRef = useRef(null);
  const dropdownRef = useRef(null);
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

  // Fetch available employees and station configurations
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesResponse, stationsResponse] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/employees`),
          fetch(`${import.meta.env.VITE_API_URL}/stations`)
        ]);

        if (!employeesResponse.ok || !stationsResponse.ok) {
          throw new Error('Failed to fetch data');
        }

        const [employeesData, stationsData] = await Promise.all([
          employeesResponse.json(),
          stationsResponse.json()
        ]);

        setAvailableEmployees(employeesData.filter(user => user?.username));
        setStationConfigs(stationsData);
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };

    fetchData();
  }, []);

  // Handle cell click
  const handleCellClick = useCallback((event, day, station) => {
    if (!isEditable || !station) return;

    const cell = event.currentTarget;
    const rect = cell.getBoundingClientRect();
    const tableContainer = cell.closest('.worksheet-table-container');
    const containerRect = tableContainer.getBoundingClientRect();
    
    setSelectedCell({ day, station });
    setDropdownPosition({
      top: rect.bottom - containerRect.top,
      right: containerRect.right - rect.right
    });
    setShowDropdown(true);
  }, [isEditable]);

  // Handle employee selection
  const handleEmployeeSelect = useCallback(async (employeeUsername) => {
    if (!selectedCell) return;

    const { day, station } = selectedCell;
    const key = `${day}-${station}`;
    const currentValue = localEntries[key] || '';
    const currentEmployees = currentValue.split(' | ').filter(Boolean);
    
    let newValue;
    if (currentEmployees.includes(employeeUsername)) {
      // Remove employee if already selected
      newValue = currentEmployees
        .filter(emp => emp !== employeeUsername)
        .join(' | ');
    } else {
      // Add employee if not selected
      newValue = currentValue 
        ? `${currentValue} | ${employeeUsername}`
        : employeeUsername;
    }

    try {
      await onCellUpdate(day, station, newValue);
      setLocalEntries(prev => ({
        ...prev,
        [key]: newValue
      }));
      // Don't close dropdown after selection
      // setShowDropdown(false);
      // setSelectedCell(null);
    } catch (error) {
      console.error('Failed to update cell:', error);
    }
  }, [selectedCell, localEntries, onCellUpdate]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setSelectedCell(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  // Calculate column widths based on content
  const calculateColumnWidths = useCallback(() => {
    const table = tableRef.current?.querySelector('.worksheet-table');
    if (!table) return;

    const rows = table.querySelectorAll('tr');
    const headers = rows[0]?.querySelectorAll('th');
    if (!headers) return;

    // Reset any previous width settings
    headers.forEach(header => {
      header.style.width = 'auto';
    });

    // Calculate maximum width for each column
    const columnWidths = Array(headers.length).fill(0);
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      cells.forEach((cell, index) => {
        const contentWidth = cell.scrollWidth;
        columnWidths[index] = Math.max(columnWidths[index], contentWidth);
      });
    });

    // Apply the calculated widths
    headers.forEach((header, index) => {
      // Add some padding to ensure content doesn't touch the edges
      const width = columnWidths[index] + 16; // 8px padding on each side
      header.style.width = `${width}px`;
    });
  }, []);

  // Call calculateColumnWidths when component mounts and when data changes
  useEffect(() => {
    calculateColumnWidths();
    // Add a small delay to ensure content is rendered
    const timer = setTimeout(calculateColumnWidths, 100);
    return () => clearTimeout(timer);
  }, [calculateColumnWidths, entries, workstations]);

  // Add zoom control functions
  const handleZoomIn = () => {
    if (zoomLevel < 200) {
      setZoomLevel(prev => prev + 10);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 50) {
      setZoomLevel(prev => prev - 10);
    }
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };

  // Update table content style based on zoom level
  const tableStyle = {
    transform: `scale(${zoomLevel / 100})`,
    width: `${100 * (100 / zoomLevel)}%`
  };

  // Update dropdown style to counter zoom effect
  useEffect(() => {
    document.documentElement.style.setProperty('--inverse-zoom', `${100 / zoomLevel}`);
  }, [zoomLevel]);

  return (
    <div className="worksheet-container">
      <div className="worksheet-header">
        <h2 className="worksheet-title">
          {`${hebrewMonths[month-1]} ${year}`}
        </h2>
        <div className="zoom-controls">
          <button 
            className="zoom-button" 
            onClick={handleZoomOut}
            disabled={zoomLevel <= 50}
            title="Zoom Out"
          >
            −
          </button>
          <span className="zoom-level" onClick={handleResetZoom} title="Reset Zoom">
            {zoomLevel}%
          </span>
          <button 
            className="zoom-button" 
            onClick={handleZoomIn}
            disabled={zoomLevel >= 200}
            title="Zoom In"
          >
            +
          </button>
        </div>
      </div>
      <div 
        className="worksheet-table-container" 
        dir="rtl" 
        ref={tableRef}
      >
        <div 
          className="table-content"
          style={tableStyle}
        >
          <table className="worksheet-table">
            <thead>
              <tr>
                <th>תאריך</th>
                <th>יום</th>
                {stationsInOrder.map(station => (
                  <th key={station}>
                    {station}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map(({ day, hebrewWeekday }) => (
                <tr 
                  key={day}
                  className={hebrewWeekday === 'ש' ? 'saturday' : ''}
                >
                  <td>{day}</td>
                  <td>{hebrewWeekday}</td>
                  {stationsInOrder.map(station => {
                    const key = `${day}-${station}`;
                    const value = localEntries[key] || '';
                    const employees = value.split(' | ').filter(Boolean);
                    
                    return (
                      <td
                        key={key}
                        onClick={(e) => handleCellClick(e, day, station)}
                        className={selectedCell?.day === day && selectedCell?.station === station ? 'selected' : ''}
                      >
                        <div className="cell-content">
                          {employees.map((employee, index) => (
                            <span key={index} className="employee-name">
                              {employee}
                            </span>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="employee-dropdown"
              style={{
                position: 'absolute',
                top: dropdownPosition.top,
                right: dropdownPosition.right
              }}
            >
              {availableEmployees.map(employee => {
                const key = `${selectedCell.day}-${selectedCell.station}`;
                const currentValue = localEntries[key] || '';
                const isSelected = currentValue.split(' | ').includes(employee.username);
                
                return (
                  <div
                    key={employee.id}
                    className={`employee-option ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleEmployeeSelect(employee.username)}
                  >
                    {isSelected ? '✓ ' : ''}{employee.username}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.forwardRef(WorksheetTable); 