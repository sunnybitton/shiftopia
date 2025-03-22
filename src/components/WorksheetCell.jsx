import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './WorksheetCell.css';

const WorksheetCell = ({
  day,
  station,
  value,
  onChange,
  isEditable,
  availableEmployees = [],
  stations = [] // Add stations prop to get configurations
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Parse the value into an array of employees
  const currentEmployees = useMemo(() => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      // Split by comma if it's a comma-separated string
      return value.split(',').map(v => v.trim()).filter(Boolean);
    }
    return value ? [value] : [];
  }, [value]);

  // Get station's max employees limit
  const maxEmployees = useMemo(() => {
    // Find the station configuration
    const stationConfig = stations.find(s => s.name === station);
    if (!stationConfig) {
      return Infinity; // Default to unlimited if station not found
    }

    const maxEmp = stationConfig.attributes?.maxEmployees;
    if (maxEmp === 'Unlimited' || maxEmp === undefined) {
      return Infinity;
    }
    return parseInt(maxEmp) || 1;
  }, [station, stations]);

  // Memoize the filter function
  const getFilteredEmployees = useCallback(() => {
    // If we've reached the max employees limit and it's not unlimited, return empty array
    if (maxEmployees !== Infinity && currentEmployees.length >= maxEmployees) {
      return [];
    }

    if (!searchTerm) {
      // Filter out already selected employees
      return availableEmployees.filter(employee => 
        !currentEmployees.includes(employee.username)
      );
    }
    
    return availableEmployees.filter(employee => {
      const matches = employee?.username?.toLowerCase().includes(searchTerm.toLowerCase());
      return matches && !currentEmployees.includes(employee.username);
    });
  }, [availableEmployees, searchTerm, currentEmployees, maxEmployees]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isOpen) return;
      
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle employee selection
  const handleSelect = useCallback(async (employeeUsername) => {
    // Check if adding another employee would exceed the limit (unless unlimited)
    if (maxEmployees !== Infinity && currentEmployees.length >= maxEmployees) {
      alert(`Cannot add more employees. Maximum limit of ${maxEmployees} reached for this station.`);
      return;
    }

    try {
      const updatedEmployees = [...currentEmployees, employeeUsername];
      await onChange(day, station, updatedEmployees.join(','));
      setIsOpen(false);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to add employee:', error);
      alert('Failed to add employee. Please try again.');
    }
  }, [day, station, onChange, currentEmployees, maxEmployees]);

  // Handle employee removal
  const handleRemove = useCallback(async (employeeToRemove) => {
    try {
      const updatedEmployees = currentEmployees.filter(emp => emp !== employeeToRemove);
      await onChange(day, station, updatedEmployees.join(','));
    } catch (error) {
      console.error('Failed to remove employee:', error);
      alert('Failed to remove employee. Please try again.');
    }
  }, [day, station, onChange, currentEmployees]);

  // Handle input focus
  const handleFocus = useCallback(() => {
    if (isEditable) {
      if (maxEmployees !== Infinity && currentEmployees.length >= maxEmployees) {
        alert(`Maximum limit of ${maxEmployees} employees reached for this station.`);
        return;
      }
      setIsOpen(true);
    }
  }, [isEditable, currentEmployees.length, maxEmployees]);

  // Handle input change for search
  const handleInputChange = useCallback((e) => {
    const newSearchTerm = e.target.value;
    setSearchTerm(newSearchTerm);
    setIsOpen(true);
  }, []);

  const filteredEmployees = getFilteredEmployees();

  return (
    <div className="worksheet-cell">
      <div className="employee-list">
        {currentEmployees.map((employeeName, index) => (
          <div key={`${employeeName}-${index}`} className="employee-name-tag">
            <span className="employee-name-text">{employeeName}</span>
            {isEditable && (
              <button
                type="button"
                className="remove-employee-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(employeeName);
                }}
                title="הסר עובד"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      {isEditable && (maxEmployees === Infinity || currentEmployees.length < maxEmployees) && (
        <input
          ref={inputRef}
          type="text"
          className="cell-input"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="+"
          aria-label={`Add employee to ${station} on day ${day}`}
        />
      )}
      {isOpen && isEditable && (
        <div ref={dropdownRef} className="employee-dropdown">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map(employee => (
              <div
                key={employee.id}
                className="employee-option"
                onClick={() => handleSelect(employee.username)}
              >
                <span className="employee-name">{employee.username}</span>
                {employee.certifications?.length > 0 && (
                  <span className="employee-certifications">
                    {employee.certifications.join(', ')}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="no-results">
              {maxEmployees !== Infinity && currentEmployees.length >= maxEmployees 
                ? `Maximum limit of ${maxEmployees} employees reached`
                : 'No matching employees'}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WorksheetCell; 