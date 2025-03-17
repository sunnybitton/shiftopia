import React, { useState } from 'react';
import './NewWorksheetModal.css';

const NewWorksheetModal = ({ isOpen, onClose, onSubmit }) => {
  const [month, setMonth] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const months = [
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!month || !year) return;
    onSubmit({ month, year });
    onClose();
    setMonth('');
    setYear(currentYear);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" dir="rtl">
        <h2>Create New Worksheet</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="month">Month:</label>
            <select
              id="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            >
              <option value="">Select Month</option>
              {months.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="year">Year:</label>
            <select
              id="year"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              required
            >
              {years.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-button">
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Generate Worksheet
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewWorksheetModal; 