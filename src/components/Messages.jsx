import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { fetchSheetData } from '../services/sheetsService';
import LoadingSpinner from './LoadingSpinner';
import "react-datepicker/dist/react-datepicker.css";
import './Messages.css';

const Messages = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [showDateRange, setShowDateRange] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [messagePreview, setMessagePreview] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  useEffect(() => {
    const fetchMessageTemplate = async () => {
      try {
        const data = await fetchSheetData('DATA');
        const template = data[1]?.[13] || 'Default message template';
        setMessageTemplate(template);
      } catch (err) {
        console.error('Error fetching message template:', err);
        setMessageTemplate('Default message template');
      }
    };

    fetchMessageTemplate();
  }, []);

  useEffect(() => {
    const updatePreview = async () => {
      try {
        let previewMessage = '';
        
        if (showDateRange && endDate) {
          const dates = [];
          let currentDate = new Date(startDate);
          const lastDate = new Date(endDate);
          lastDate.setDate(lastDate.getDate() + 1);
          
          while (currentDate < lastDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }

          for (let i = 0; i < dates.length; i++) {
            const date = dates[i];
            const schedule = await fetchScheduleForDate(date);
            
            let dateMessage = (i === 0 ? '\u200F' : '') + messageTemplate
              .replace(/\\n/g, '\n')
              .replace(/{dayInHebrew}/g, getDayInHebrew(date))
              .replace(/{date}/g, formatDateDDMM(date))
              .replace(/{carmelSide}/g, schedule.carmelSide)
              .replace(/{carmelDoctor}/g, schedule.carmelDoctor)
              .replace(/{yamSide}/g, schedule.yamSide)
              .replace(/{yamDoctor}/g, schedule.yamDoctor)
              .replace(/{dayHospitalization}/g, schedule.dayHospitalization)
              .replace(/{triage}/g, schedule.triage);

            previewMessage += dateMessage + (i < dates.length - 1 ? '\n\n\n' : '');
          }
        } else {
          const schedule = await fetchScheduleForDate(startDate);
          previewMessage = '\u200F' + messageTemplate
            .replace(/\\n/g, '\n')
            .replace(/{dayInHebrew}/g, getDayInHebrew(startDate))
            .replace(/{date}/g, formatDateDDMM(startDate))
            .replace(/{carmelSide}/g, schedule.carmelSide)
            .replace(/{carmelDoctor}/g, schedule.carmelDoctor)
            .replace(/{yamSide}/g, schedule.yamSide)
            .replace(/{yamDoctor}/g, schedule.yamDoctor)
            .replace(/{dayHospitalization}/g, schedule.dayHospitalization)
            .replace(/{triage}/g, schedule.triage);
        }

        setMessagePreview(previewMessage);
      } catch (err) {
        console.error('Error updating preview:', err);
        setMessagePreview('Error generating preview');
      }
    };

    updatePreview();
  }, [startDate, endDate, showDateRange, messageTemplate]);

  const getDayInHebrew = (date) => {
    const days = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת'];
    return days[date.getDay()];
  };

  const formatDateDDMM = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    return `${day}/${month}`;
  };

  const fetchScheduleForDate = async (date) => {
    try {
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

      const findPeopleForStation = (stationType) => {
        const people = [];
        stationNames.forEach((station, index) => {
          if (station?.includes(stationType) && dayRow[index]) {
            people.push(dayRow[index]);
          }
        });
        return people.length > 0 ? people.join(', ') : 'לא נקבע';
      };

      return {
        carmelSide: findPeopleForStation('צד כרמל'),
        carmelDoctor: findPeopleForStation('א. צד-כרמל'),
        yamSide: findPeopleForStation('צד ים'),
        yamDoctor: findPeopleForStation('א. צד-ים'),
        dayHospitalization: findPeopleForStation('אשפוז יום'),
        triage: findPeopleForStation('מיון')
      };

    } catch (err) {
      console.error('Error fetching schedule:', err);
      return {
        carmelSide: 'לא נקבע',
        carmelDoctor: 'לא נקבע',
        yamSide: 'לא נקבע',
        yamDoctor: 'לא נקבע',
        dayHospitalization: 'לא נקבע',
        triage: 'לא נקבע'
      };
    }
  };

  const handleDateChange = (date, isStart = true) => {
    if (isStart) {
      setStartDate(date);
      if (endDate && date > endDate) {
        setEndDate(null);
      }
    } else {
      setEndDate(date);
    }
    setDatePickerOpen(false);
  };

  const handleSendDailyMessages = async () => {
    try {
      setLoading(true);
      
      const textarea = document.createElement('textarea');
      textarea.value = messagePreview;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      alert('הטקסט הועתק ללוח בהצלחה! אפשר להדביק אותו בוואטסאפ.');
    } catch (err) {
      console.error('Error sending messages:', err);
      alert('Error sending messages');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Processing messages..." />;
  }

  return (
    <div className="messages-container">
      <h1>Daily Messages</h1>
      
      <div className="daily-messages-section">
        <div className="date-picker-container">
          <div className="date-controls">
            <label className="date-range-toggle">
              <input
                type="checkbox"
                checked={showDateRange}
                onChange={(e) => {
                  setShowDateRange(e.target.checked);
                  setEndDate(null);
                }}
              />
              Select Date Range
            </label>
            
            <div className="date-inputs">
              <div className="date-picker-wrapper">
                <label>Start Date:</label>
                <DatePicker
                  selected={startDate}
                  onChange={(date) => handleDateChange(date, true)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="MMMM d, yyyy"
                  placeholderText="Select start date"
                  onCalendarOpen={() => setDatePickerOpen(true)}
                  onCalendarClose={() => setDatePickerOpen(false)}
                  withPortal={window.innerWidth <= 768}
                />
              </div>
              
              {showDateRange && (
                <div className="date-picker-wrapper">
                  <label>End Date:</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => handleDateChange(date, false)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select end date"
                    onCalendarOpen={() => setDatePickerOpen(true)}
                    onCalendarClose={() => setDatePickerOpen(false)}
                    withPortal={window.innerWidth <= 768}
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className="message-preview">
            <h3>Message Preview</h3>
            <div className="preview-content">
              <pre>{messagePreview || 'Loading preview...'}</pre>
            </div>
          </div>
          
          <button 
            className="send-messages-button"
            onClick={handleSendDailyMessages}
            disabled={loading || !startDate || (showDateRange && !endDate)}
          >
            {loading ? 'Processing...' : 'Copy Messages To Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages; 