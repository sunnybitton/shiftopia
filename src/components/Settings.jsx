import React, { useState, useEffect } from 'react';
import { updateSheetData } from '../services/sheetsService';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import LoadingSpinner from './LoadingSpinner';
import WorksheetSettings from './WorksheetSettings';
import './Settings.css';

const API_URL = import.meta.env.VITE_API_URL;

const Settings = () => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [columnPreferences, setColumnPreferences] = useState(null);
  const [columnError, setColumnError] = useState('');
  const [columnSuccess, setColumnSuccess] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';

  // Column configuration
  const allColumns = [
    { id: 'name', label: 'Name', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'role', label: 'Role', required: false },
    { id: 'username', label: 'Username', required: false },
    { id: 'worker_id', label: 'Worker ID', required: false },
    { id: 'phone', label: 'Phone', required: false }
  ];

  // Add this helper function at the top level of the component
  const cleanId = (id) => id.replace(/[^\w-]/g, '');

  useEffect(() => {
    fetchColumnPreferences();
  }, []);

  const fetchColumnPreferences = async () => {
    try {
      // First try to get from localStorage
      const storedPreferences = localStorage.getItem('columnPreferences');
      if (storedPreferences) {
        const preferences = JSON.parse(storedPreferences);
        // Clean IDs and ensure columnOrder contains all visible columns
        const updatedPreferences = {
          visibleColumns: preferences.visibleColumns.map(cleanId),
          columnOrder: preferences.columnOrder
            .map(cleanId)
            .filter(col => preferences.visibleColumns.map(cleanId).includes(cleanId(col)))
        };
        setColumnPreferences(updatedPreferences);
        return;
      }

      // If not in localStorage, fetch from server
      const response = await fetch(`${API_URL}/settings/column-preferences`);
      if (!response.ok) {
        throw new Error('Failed to fetch column preferences');
      }
      const data = await response.json();
      // Filter out id fields and clean IDs
      const cleanedVisibleColumns = data.visibleColumns
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));

      const cleanedColumnOrder = data.columnOrder
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
      // Filter out id and active fields, clean IDs, and ensure columnOrder matches visibleColumns
      const filteredPreferences = {
        visibleColumns: cleanedVisibleColumns,
        columnOrder: cleanedColumnOrder
      };
      setColumnPreferences(filteredPreferences);
      localStorage.setItem('columnPreferences', JSON.stringify(filteredPreferences));
    } catch (error) {
      console.error('Error fetching column preferences:', error);
      setColumnError('Failed to load column preferences');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    try {
      setLoading(true);
      await updateSheetData(user.email, currentPassword, newPassword);
      setSuccess('Password updated successfully');
      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      console.error('Error updating password:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleColumnToggle = (columnId) => {
    const cleanedId = cleanId(columnId);
    
    const newVisibleColumns = columnPreferences.visibleColumns.includes(cleanedId)
      ? columnPreferences.visibleColumns.filter(id => cleanId(id) !== cleanedId)
      : [...columnPreferences.visibleColumns, cleanedId];

    // Update column order when toggling visibility
    let newColumnOrder = columnPreferences.columnOrder.map(cleanId);
    
    if (newVisibleColumns.includes(cleanedId) && !newColumnOrder.includes(cleanedId)) {
      // Add column to order if it's newly visible
      newColumnOrder = [...newColumnOrder, cleanedId];
    } else if (!newVisibleColumns.includes(cleanedId)) {
      // Remove column from order if it's no longer visible
      newColumnOrder = newColumnOrder.filter(id => cleanId(id) !== cleanedId);
    }

    const newPreferences = {
      visibleColumns: newVisibleColumns,
      columnOrder: newColumnOrder,
    };
    setColumnPreferences(newPreferences);
    setHasUnsavedChanges(true);
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(columnPreferences.columnOrder).map(cleanId);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Ensure the column order only contains visible columns with clean IDs
    const newColumnOrder = items.filter(id => 
      columnPreferences.visibleColumns.map(cleanId).includes(cleanId(id))
    );

    const newPreferences = {
      ...columnPreferences,
      columnOrder: newColumnOrder,
    };
    setColumnPreferences(newPreferences);
    setHasUnsavedChanges(true);
  };

  const saveColumnPreferences = async () => {
    try {
      setColumnError('');
      setColumnSuccess('');

      // Clean IDs before saving
      const cleanedPreferences = {
        visibleColumns: columnPreferences.visibleColumns.map(cleanId),
        columnOrder: columnPreferences.columnOrder.map(cleanId)
      };

      const response = await fetch(`${API_URL}/settings/column-preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedPreferences),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save column preferences');
      }

      setHasUnsavedChanges(false);
      setColumnSuccess('Changes saved successfully');
      
      // Store cleaned preferences in localStorage
      localStorage.setItem('columnPreferences', JSON.stringify(cleanedPreferences));
      setColumnPreferences(cleanedPreferences);
    } catch (error) {
      console.error('Error saving column preferences:', error);
      setColumnError(error.message || 'Failed to save changes');
      // Revert to last saved preferences on error
      await fetchColumnPreferences();
    }
  };

  const resetColumnPreferences = async () => {
    try {
      setColumnError('');
      setColumnSuccess('');
      const response = await fetch(`${API_URL}/settings/column-preferences/reset`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reset column preferences');
      }

      // Get the default preferences from the response and clean IDs
      const defaultPreferences = await response.json();
      const cleanedPreferences = {
        visibleColumns: defaultPreferences.visibleColumns.map(cleanId),
        columnOrder: defaultPreferences.columnOrder.map(cleanId)
      };

      setColumnPreferences(cleanedPreferences);
      setHasUnsavedChanges(false);
      setColumnSuccess('Preferences reset to default');
      
      // Store cleaned preferences in localStorage
      localStorage.setItem('columnPreferences', JSON.stringify(cleanedPreferences));
    } catch (error) {
      console.error('Error resetting column preferences:', error);
      setColumnError(error.message || 'Failed to reset preferences');
    }
  };

  if (loading) {
    return <LoadingSpinner text="Updating settings..." />;
  }

  return (
    <div className="settings">
      <h1>Settings</h1>
      
      {/* Password Change Section */}
      <div className="settings-container">
        <h2>Change Password</h2>
        <form onSubmit={handlePasswordChange}>
          <input
            type="text"
            id="username"
            name="username"
            autoComplete="username"
            value={user.email || ''}
            style={{ display: 'none' }}
            readOnly
          />
          <div className="form-group">
            <label htmlFor="currentPassword">Current Password</label>
            <input
              type="password"
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="newPassword">New Password</label>
            <input
              type="password"
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <button type="submit" disabled={loading}>
            Update Password
          </button>
        </form>
      </div>

      {/* Worksheet Settings Section */}
      {isManager && (
        <div className="settings-container">
          <WorksheetSettings />
        </div>
      )}

      {/* Employees Page Configuration Section (Managers Only) */}
      {isManager && columnPreferences && (
        <div className="settings-container">
          <h2>Employees Page Configuration</h2>
          <div className="column-preferences">
            <div className="column-toggles">
              <h3>Visible Columns</h3>
              <div className="toggle-list">
                {allColumns.map(({ id, label, required }) => {
                  const cleanedId = cleanId(id);
                  return (
                    <label key={cleanedId} className="toggle-item">
                      <input
                        type="checkbox"
                        checked={columnPreferences.visibleColumns.map(cleanId).includes(cleanedId)}
                        onChange={() => handleColumnToggle(cleanedId)}
                        disabled={required}
                      />
                      <span>{label}</span>
                      {required && <span className="required-badge">Required</span>}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="column-order">
              <h3>Column Order</h3>
              <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId={cleanId('column-list')}>
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="order-list"
                    >
                      {columnPreferences?.columnOrder.map((columnId, index) => {
                        const cleanedId = cleanId(columnId);
                        const column = allColumns.find(col => cleanId(col.id) === cleanedId);
                        if (!column || !columnPreferences.visibleColumns.map(cleanId).includes(cleanedId)) return null;
                        
                        return (
                          <Draggable
                            key={cleanedId}
                            draggableId={cleanedId}
                            index={index}
                            isDragDisabled={column.required}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`order-item ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                {column.label}
                                {column.required && (
                                  <span className="required-badge">Required</span>
                                )}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>

            {columnError && <div className="error-message">{columnError}</div>}
            {columnSuccess && <div className="success-message">{columnSuccess}</div>}
            
            <div className="column-actions">
              <button 
                onClick={saveColumnPreferences} 
                className="save-button"
                disabled={!hasUnsavedChanges}
              >
                {hasUnsavedChanges ? 'Save Changes*' : 'Save Changes'}
              </button>
              <button onClick={resetColumnPreferences} className="reset-button">
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings; 