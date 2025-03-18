import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import NewWorksheetModal from './NewWorksheetModal';
import WorksheetTable from './WorksheetTable';
import ToggleSwitch from './ToggleSwitch';
import './Worksheets.css';

// Icons as SVG components
const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const ViewIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"></path>
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
  </svg>
);

const Worksheets = () => {
  const [worksheets, setWorksheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedWorksheet, setSelectedWorksheet] = useState(null);
  const [worksheetEntries, setWorksheetEntries] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';

  useEffect(() => {
    fetchWorksheets();
  }, []);

  useEffect(() => {
    if (selectedWorksheet?.id) {
      fetchWorksheetEntries(selectedWorksheet.id);
    }
  }, [selectedWorksheet]);

  const fetchWorksheets = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets`);
      if (!response.ok) throw new Error('Failed to fetch worksheets');
      const data = await response.json();
      setWorksheets(data);
    } catch (err) {
      setError('Failed to load worksheets');
      console.error('Error fetching worksheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorksheetEntries = async (worksheetId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets/${worksheetId}/entries`);
      if (!response.ok) throw new Error('Failed to fetch worksheet entries');
      const data = await response.json();
      setWorksheetEntries(prev => ({
        ...prev,
        [worksheetId]: data
      }));
    } catch (err) {
      console.error('Error fetching worksheet entries:', err);
    }
  };

  const handleStatusToggle = async (worksheetId, newStatus) => {
    try {
      console.log(`Updating worksheet ${worksheetId} status to ${newStatus}`);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets/${worksheetId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Server error:', errorData);
        throw new Error(errorData?.error || 'Failed to update status');
      }
      
      const updatedWorksheet = await response.json();
      console.log('Status updated successfully:', updatedWorksheet);
      
      setWorksheets(worksheets.map(ws => 
        ws.id === worksheetId ? { ...ws, status: updatedWorksheet.status } : ws
      ));
    } catch (err) {
      console.error('Error updating worksheet status:', err);
      // Revert the toggle state since the update failed
      setWorksheets(worksheets.map(ws => 
        ws.id === worksheetId ? { ...ws } : ws
      ));
    }
  };

  const handleCreateNew = () => {
    setSelectedWorksheet(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async ({ month, year }) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          month,
          year,
          name: `${month}_${year}`,
          status: 'draft'
        }),
      });
      if (!response.ok) throw new Error('Failed to create worksheet');
      const newWorksheet = await response.json();
      
      setWorksheets([...worksheets, newWorksheet]);
      setSelectedWorksheet(newWorksheet);
    } catch (err) {
      console.error('Error creating worksheet:', err);
    }
  };

  const handleView = (worksheet) => {
    setSelectedWorksheet(worksheet);
  };

  const handleEdit = (worksheet) => {
    setSelectedWorksheet(worksheet);
  };

  const handleDelete = async (worksheetId) => {
    if (window.confirm('Are you sure you want to delete this worksheet?')) {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets/${worksheetId}`, {
          method: 'DELETE',
        });
        if (!response.ok) throw new Error('Failed to delete worksheet');
        
        setWorksheets(worksheets.filter(ws => ws.id !== worksheetId));
        if (selectedWorksheet?.id === worksheetId) {
          setSelectedWorksheet(null);
        }
      } catch (err) {
        console.error('Error deleting worksheet:', err);
      }
    }
  };

  const handleCellUpdate = async (worksheetId, day, workstation, value) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/worksheets/${worksheetId}/entries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          day,
          workstation,
          employee_assigned: value
        }),
      });
      if (!response.ok) throw new Error('Failed to update worksheet entry');
      
      const updatedEntry = await response.json();
      setWorksheetEntries(prev => ({
        ...prev,
        [worksheetId]: prev[worksheetId].map(entry => 
          entry.day === day && entry.workstation === workstation
            ? updatedEntry
            : entry
        )
      }));
    } catch (err) {
      console.error('Error updating worksheet entry:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading worksheets..." />;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <div className="worksheets-container">
      <div className="worksheets-header">
        <h1>Worksheets</h1>
        {isManager && (
          <button 
            onClick={handleCreateNew}
            className="icon-button add-button"
            title="Create New Worksheet"
          >
            <AddIcon />
          </button>
        )}
      </div>

      <div className="worksheets-list">
        {worksheets.map(worksheet => (
          <div key={worksheet.id} className="worksheet-item">
            <div className="worksheet-name">
              {worksheet.name}
              <span className={`status-badge ${worksheet.status}`}>
                {worksheet.status === 'published' ? '✅' : '📝'}
              </span>
            </div>
            <div className="worksheet-actions">
              <button 
                className="icon-button view-button"
                onClick={() => handleView(worksheet)}
                title="View worksheet"
              >
                <ViewIcon />
              </button>
              {(isManager || worksheet.canEdit) && (
                <button 
                  className="icon-button edit-button"
                  onClick={() => handleEdit(worksheet)}
                  title="Edit worksheet"
                >
                  <EditIcon />
                </button>
              )}
              {isManager && (
                <>
                  <div className="status-toggle">
                    <span className="status-label">Draft</span>
                    <ToggleSwitch
                      checked={worksheet.status === 'published'}
                      onChange={() => handleStatusToggle(
                        worksheet.id,
                        worksheet.status === 'published' ? 'draft' : 'published'
                      )}
                    />
                    <span className="status-label">Published</span>
                  </div>
                  <button 
                    className="icon-button delete-button"
                    onClick={() => handleDelete(worksheet.id)}
                    title="Delete worksheet"
                  >
                    <DeleteIcon />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedWorksheet && (
        <WorksheetTable
          month={selectedWorksheet.month}
          year={selectedWorksheet.year}
          workstations={['Workstation 1', 'Workstation 2', 'Workstation 3']}
          entries={worksheetEntries[selectedWorksheet.id] || []}
          onCellUpdate={(day, workstation, value) => 
            handleCellUpdate(selectedWorksheet.id, day, workstation, value)
          }
          isEditable={isManager || selectedWorksheet.canEdit}
        />
      )}

      <NewWorksheetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
      />
    </div>
  );
};

export default Worksheets; 