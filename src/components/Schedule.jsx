import React, { useState, useEffect, useMemo } from 'react';
import { fetchSheetData, exportSheetToPDF } from '../services/sheetsService';
import LoadingSpinner from './LoadingSpinner';
import './Schedule.css';
import MonthlyCalendar from './MonthlyCalendar';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import ListView from './ListView';

const Schedule = () => {
  const [activeTab, setActiveTab] = useState('current');
  const [employees, setEmployees] = useState([]);
  const [months, setMonths] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scheduleData, setScheduleData] = useState({});
  const [showCalendar, setShowCalendar] = useState(false);
  const [currentView, setCurrentView] = useState('monthly');

  // Get logged-in user's info
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userName = user.name || '';
  const userUsername = user.username || '';
  const isManager = user.role?.toLowerCase() === 'manager';

  // Memoize the employee and month lists
  const memoizedEmployees = useMemo(() => employees, [employees]);
  const memoizedMonths = useMemo(() => months, [months]);

  // Add initial data loading
  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true);
        
        // Fetch employees from our API
        const employeesResponse = await fetch(`${import.meta.env.VITE_API_URL}/employees`);
        if (!employeesResponse.ok) throw new Error('Failed to fetch employees');
        const employeesData = await employeesResponse.json();
        
        if (isManager) {
          // For managers: show all employee usernames
          const employeeUsernames = employeesData.map(emp => emp.username);
          setEmployees(employeeUsernames);
        } else {
          // For regular employees: only show their own username
          setEmployees([userUsername]);
          setSelectedEmployee(userUsername); // Auto-select the employee
        }
        
        // Fetch published worksheets from our API
        const worksheetsResponse = await fetch(`${import.meta.env.VITE_API_URL}/worksheets`);
        if (!worksheetsResponse.ok) throw new Error('Failed to fetch worksheets');
        const worksheetsData = await worksheetsResponse.json();
        
        // Filter for published worksheets and format their names
        const publishedMonths = worksheetsData
          .filter(worksheet => worksheet.status === 'published')
          .map(worksheet => worksheet.name); // This will be in the format "Month Year"
        
        setMonths(publishedMonths);
        
      } catch (error) {
        console.error('Error initializing data:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    initializeData();
  }, []); // Run once on component mount

  const handleShowSchedule = async () => {
    if (!selectedEmployee || !selectedMonth) {
      alert('Please select both an employee and a month');
      return;
    }

    try {
      setLoading(true);
      console.log('Selected employee for schedule:', selectedEmployee);
      
      const [monthName, year] = selectedMonth.split(' ');
      const monthNumber = new Date(Date.parse(monthName + " 1, 2000")).getMonth() + 1;
      const sheetName = `${monthNumber}-${year}`;

      console.log('Fetching data for sheet:', sheetName);
      const data = await fetchSheetData(sheetName);
      const schedule = processScheduleData(data, selectedEmployee);
      
      setScheduleData(schedule);
      setShowCalendar(true);
    } catch (error) {
      console.error('Error fetching schedule:', error);
      alert('Error loading schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeChange = (event) => {
    setSelectedEmployee(event.target.value);
    setShowCalendar(false); // Hide calendar when employee changes
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
    setShowCalendar(false); // Hide calendar when month changes
  };

  const processScheduleData = (data, selectedEmployee) => {
    if (!data || data.length < 6) return {};
    
    const schedule = {};
    const stationNames = data[3] || [];
    
    // Log the data we're working with
    console.log('Processing schedule data for employee:', selectedEmployee);
    console.log('Station names:', stationNames);
    
    // Process only rows 5-36 (days data)
    for (let rowIndex = 5; rowIndex < Math.min(36, data.length); rowIndex++) {
      const row = data[rowIndex];
      if (!row || row.length < 3) continue;
      
      const dayNumber = parseInt(row[2]);
      if (isNaN(dayNumber)) continue;
      
      const stations = [];
      
      // Start from index 3 for station columns
      for (let i = 3; i < row.length; i++) {
        // Get the cell value and clean it
        const cellValue = row[i]?.toString().trim() || '';
        console.log(`Day ${dayNumber}, Station ${i}:`, cellValue);
        
        // Compare with selected employee's username (case-insensitive)
        if (cellValue.toLowerCase() === selectedEmployee.toLowerCase() && stationNames[i]) {
          stations.push(stationNames[i]);
        }
      }
      
      if (stations.length > 0) {
        schedule[dayNumber] = stations;
      }
    }
    
    console.log('Processed schedule:', schedule);
    return schedule;
  };

  const handleDownloadPDF = async () => {
    if (!selectedMonth) {
      alert('Please select a month first');
      return;
    }

    try {
      setLoading(true);
      
      // Get the sheet name from selected month
      const [monthName, year] = selectedMonth.split(' ');
      const monthNumber = new Date(Date.parse(monthName + " 1, 2000")).getMonth() + 1;
      const sheetName = `${monthNumber}-${year}`;

      // Fetch the sheet data
      const data = await fetchSheetData(sheetName);
      
      if (!data || data.length === 0) {
        throw new Error('No data found in sheet');
      }

      // Look for the link in cell A4 (assuming that's where it is)
      const pdfLink = data[3]?.[0]; // Row 4, Column A

      if (!pdfLink || !pdfLink.includes('http')) {
        throw new Error('No valid PDF link found in the sheet');
      }

      // Open the link in a new tab
      window.open(pdfLink, '_blank');

    } catch (error) {
      console.error('Error opening PDF:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Get current date info
  const currentDate = new Date();
  const currentMonthName = currentDate.toLocaleString('en-US', { month: 'long' });
  const currentYear = currentDate.getFullYear();
  const currentMonthString = `${currentMonthName} ${currentYear}`;

  // Function to handle current month schedule loading
  const loadCurrentSchedule = async (newView) => {
    try {
      setLoading(true);
      setError(null);
      setCurrentView(newView || currentView);
      
      // Convert current month to sheet name format (e.g., "3-2025")
      const monthNumber = currentDate.getMonth() + 1;
      const sheetName = `${monthNumber}-${currentYear}`;
      
      console.log('Loading schedule for:', sheetName);
      const data = await fetchSheetData(sheetName);
      
      if (!data || data.length === 0) {
        throw new Error(`No schedule available for ${currentMonthString}`);
      }
      
      console.log('Processing data for user:', userUsername);
      const processedData = processScheduleData(data, userUsername);
      
      if (Object.keys(processedData).length === 0) {
        throw new Error(`No shifts found for ${userUsername} in ${currentMonthString}`);
      }
      
      setScheduleData(processedData);
      setShowCalendar(true);
    } catch (err) {
      console.error('Error loading current schedule:', err);
      setError(err.message || 'Failed to load schedule');
      setShowCalendar(false);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to check if we have valid month data
  const isValidMonthData = () => {
    if (!selectedMonth) return false;
    const [monthName, year] = selectedMonth.split(' ');
    const month = new Date(Date.parse(monthName + " 1, 2000")).getMonth() + 1;
    return !isNaN(month) && !isNaN(parseInt(year));
  };

  // Update useEffect to handle tab changes and set current month
  useEffect(() => {
    // Reset states when switching tabs
    setShowCalendar(false);
    setScheduleData({});
    
    if (activeTab === 'current') {
      // Set selected month to current month when in current tab
      setSelectedMonth(currentMonthString);
      loadCurrentSchedule('monthly');
    } else {
      // Only reset selected month when switching to other months tab
      setSelectedMonth('');
    }
  }, [activeTab, currentMonthString]); // Update dependencies

  if (loading) {
    return <LoadingSpinner text="Loading schedule..." />;
  }

  if (error) {
    return <div className="schedule">Error: {error}</div>;
  }

  return (
    <div className="schedule">
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          Current Month
        </button>
        <button 
          className={`tab-button ${activeTab === 'other' ? 'active' : ''}`}
          onClick={() => setActiveTab('other')}
        >
          Future & Past Months
        </button>
      </div>

      <div className="schedule-container">
        {activeTab === 'current' ? (
          <div className="current-month">
            <div className="header-with-pdf">
              <h2>{userName}'s Current Month Schedule</h2>
              <button 
                onClick={handleDownloadPDF} 
                disabled={loading}
                className="pdf-button"
                title="Download PDF"
              >
                <PictureAsPdfIcon />
              </button>
            </div>
            <div className="view-buttons">
              <button 
                className={`view-button ${currentView === 'monthly' ? 'active' : ''}`}
                onClick={() => loadCurrentSchedule('monthly')}
                disabled={loading}
              >
                Monthly
              </button>
              <button 
                className={`view-button ${currentView === 'weekly' ? 'active' : ''}`}
                onClick={() => loadCurrentSchedule('weekly')}
                disabled={loading}
              >
                Weekly
              </button>
              <button 
                className={`view-button ${currentView === 'daily' ? 'active' : ''}`}
                onClick={() => loadCurrentSchedule('daily')}
                disabled={loading}
              >
                Daily
              </button>
            </div>
            
            {loading ? (
              <div>Loading schedule...</div>
            ) : showCalendar && (
              currentView === 'monthly' ? (
                <MonthlyCalendar
                  month={currentDate.getMonth() + 1}
                  year={currentDate.getFullYear()}
                  scheduleData={scheduleData}
                />
              ) : (
                <ListView 
                  scheduleData={scheduleData}
                  setScheduleData={setScheduleData}
                  view={currentView}
                  currentDate={currentDate}
                />
              )
            )}
          </div>
        ) : (
          <div className="other-months">
            <div className="selectors-wrapper">
              <div className="selector">
                <label htmlFor="employee">Employee:</label>
                {isManager ? (
                  <select
                    id="employee"
                    value={selectedEmployee}
                    onChange={handleEmployeeChange}
                  >
                    <option value="">Choose an employee...</option>
                    {memoizedEmployees.map((employee) => (
                      <option key={employee} value={employee}>
                        {employee}
                      </option>
                    ))}
                  </select>
                ) : (
                  <select
                    id="employee"
                    value={userName}
                    disabled
                  >
                    <option value={userName}>{userName}</option>
                  </select>
                )}
              </div>

              <div className="selector">
                <label htmlFor="month">Select Month:</label>
                <select
                  id="month"
                  value={selectedMonth}
                  onChange={handleMonthChange}
                >
                  <option value="">Choose a month...</option>
                  {memoizedMonths.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div className="button-group">
                <button 
                  onClick={handleShowSchedule} 
                  disabled={loading}
                >
                  {loading ? 'Loading...' : 'Show Schedule'}
                </button>
                <button 
                  onClick={handleDownloadPDF} 
                  disabled={!selectedMonth || loading}
                  className="pdf-button"
                  title="Download Sheet as PDF"
                >
                  <PictureAsPdfIcon />
                </button>
              </div>
            </div>

            {showCalendar && (
              <MonthlyCalendar
                month={new Date(Date.parse(selectedMonth)).getMonth() + 1}
                year={new Date(Date.parse(selectedMonth)).getFullYear()}
                scheduleData={scheduleData}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Schedule; 