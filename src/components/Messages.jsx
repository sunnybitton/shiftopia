import React, { useState, useEffect } from 'react';
import DatePicker from 'react-datepicker';
import { fetchSheetData } from '../services/sheetsService';
import "react-datepicker/dist/react-datepicker.css";
import './Messages.css';

const Messages = () => {
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(null);
  const [showDateRange, setShowDateRange] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState('');
  const [scheduleData, setScheduleData] = useState(null);

  useEffect(() => {
    const fetchMessageTemplate = async () => {
      try {
        const data = await fetchSheetData('DATA');
        
        // Get message template from N2 (index [1][13])
        const template = data[1]?.[13] || 'Default message template';

        
        setMessageTemplate(template);
        
      } catch (err) {
        console.error('Error fetching message template:', err);
        setMessageTemplate('Default message template');
      }
    };

    fetchMessageTemplate();
  }, []);

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
      // Get the correct sheet name based on the selected date
      const monthNumber = date.getMonth() + 1;
      const year = date.getFullYear();
      const sheetName = `${monthNumber}-${year}`;
      
      console.log('Fetching sheet:', sheetName);
      const data = await fetchSheetData(sheetName);
      
      if (!data || data.length < 6) {
        throw new Error('No schedule data available');
      }

      // Get station names from row 4
      const stationNames = data[3] || [];
      
      // Get the specific day's data (row is day number + 4)
      const dayNumber = date.getDate();
      const dayRow = data[dayNumber + 4];
      
      if (!dayRow) {
        throw new Error('No data for selected date');
      }

      // Function to find all people for a specific station
      const findPeopleForStation = (stationType) => {
        const people = [];
        stationNames.forEach((station, index) => {
          if (station?.includes(stationType) && dayRow[index]) {
            people.push(dayRow[index]);
          }
        });
        return people.length > 0 ? people.join(', ') : 'לא נקבע';
      };

      // Find people for each station type
      const schedule = {
        carmelSide: findPeopleForStation('צד כרמל'),
        carmelDoctor: findPeopleForStation('א. צד-כרמל'),
        yamSide: findPeopleForStation('צד ים'),
        yamDoctor: findPeopleForStation('א. צד-ים'),
        dayHospitalization: findPeopleForStation('אשפוז יום'),
        triage: findPeopleForStation('מיון')
      };

      console.log('Found schedule:', schedule);
      return schedule;

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

  const findPersonByColumn = (dayRow, columnIndex) => {
    return dayRow[columnIndex] || 'לא נקבע';
  };

  const sendWhatsAppMessage = (phoneNumber, message) => {
    try {
      // Create a temporary textarea element
      const textarea = document.createElement('textarea');
      textarea.value = message;
      document.body.appendChild(textarea);
      
      // Copy the message to clipboard
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      
      // Alert the user in Hebrew
      alert('הטקסט הועתק ללוח בהצלחה! אפשר להדביק אותו בוואטסאפ.');

    } catch (err) {
      console.error('Error copying message:', err);
      alert('שגיאה בהעתקת ההודעה. אנא נסו שוב.');
    }
  };

  const sendEmail = (email, subject, message) => {
    const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.location.href = mailtoUrl;
  };

  const handleSendDailyMessages = async () => {
    try {
      setLoading(true);
      let finalMessage = '';

      // If showing date range, get messages for all dates in range
      if (showDateRange && endDate) {
        // Generate array of all dates in the range
        const dates = [];
        let currentDate = new Date(startDate);
        const lastDate = new Date(endDate);
        
        // Add one day to endDate for inclusive comparison
        lastDate.setDate(lastDate.getDate() + 1);
        
        while (currentDate < lastDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Process each date in the range
        for (let i = 0; i < dates.length; i++) {
          const date = dates[i];
          const schedule = await fetchScheduleForDate(date);
          
          // Add RTL mark only to the first message
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

          // Add to final message with triple line breaks between days
          finalMessage += dateMessage + (i < dates.length - 1 ? '\n\n\n' : '');
        }

      } else {
        // Single date message
        const schedule = await fetchScheduleForDate(startDate);
        finalMessage = '\u200F' + messageTemplate
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

      // Copy message directly without asking for platform choice
      sendWhatsAppMessage(null, finalMessage);

    } catch (err) {
      console.error('Error sending messages:', err);
      alert('Error sending messages');
    } finally {
      setLoading(false);
    }
  };

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
                  onChange={(date) => setStartDate(date)}
                  selectsStart
                  startDate={startDate}
                  endDate={endDate}
                  dateFormat="MMMM d, yyyy"
                  placeholderText="Select start date"
                />
              </div>
              
              {showDateRange && (
                <div className="date-picker-wrapper">
                  <label>End Date:</label>
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    selectsEnd
                    startDate={startDate}
                    endDate={endDate}
                    minDate={startDate}
                    dateFormat="MMMM d, yyyy"
                    placeholderText="Select end date"
                  />
                </div>
              )}
            </div>
          </div>
          
          <button 
            className="send-messages-button"
            onClick={handleSendDailyMessages}
            disabled={loading || !startDate}
          >
            {loading ? 'Sending...' : 'Copy Messages To Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Messages; 