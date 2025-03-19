import React, { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import './WorksheetSettings.css';

// Icons as SVG components
const MoveUpIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
);

const MoveDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);

const DeleteIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
  </svg>
);

const WorksheetSettings = () => {
  const [stations, setStations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(null);
  const [editingAttribute, setEditingAttribute] = useState(null);

  useEffect(() => {
    fetchStations();
  }, []);

  const fetchStations = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stations`);
      if (!response.ok) throw new Error('Failed to fetch stations');
      const data = await response.json();
      setStations(data);
    } catch (err) {
      setError('Failed to load stations');
      console.error('Error fetching stations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveStation = async (index, direction) => {
    const newStations = [...stations];
    const station = newStations[index];
    const newIndex = direction === 'up' ? index - 1 : index + 1;

    if (newIndex < 0 || newIndex >= newStations.length) return;

    newStations.splice(index, 1);
    newStations.splice(newIndex, 0, station);
    setStations(newStations);

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/stations/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stations: newStations.map((s, i) => ({ id: s.id, order: i })) }),
      });
    } catch (err) {
      console.error('Error reordering stations:', err);
      fetchStations(); // Refresh from server on error
    }
  };

  const handleUpdateStation = async (id, updates) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!response.ok) throw new Error('Failed to update station');
      
      setStations(stations.map(station => 
        station.id === id ? { ...station, ...updates } : station
      ));
    } catch (err) {
      console.error('Error updating station:', err);
    }
  };

  const handleDeleteStation = async (id) => {
    if (!window.confirm('Are you sure you want to delete this station?')) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stations/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete station');
      
      setStations(stations.filter(station => station.id !== id));
    } catch (err) {
      console.error('Error deleting station:', err);
    }
  };

  const handleAddStation = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/stations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Station',
          short_code: 'NEW',
          attributes: {
            maxEmployees: 1,
            color: '#808080',
            requiresCertification: [],
            overlapAllowed: false
          }
        }),
      });
      if (!response.ok) throw new Error('Failed to add station');
      
      const newStation = await response.json();
      setStations([...stations, newStation]);
    } catch (err) {
      console.error('Error adding station:', err);
    }
  };

  const renderAttributes = (station) => {
    const attrs = station.attributes;
    return (
      <div className="station-attributes">
        <div className="attribute">
          <label>Max Employees:</label>
          <select
            value={attrs.maxEmployees}
            onChange={(e) => handleUpdateStation(station.id, {
              attributes: { ...attrs, maxEmployees: e.target.value === 'Unlimited' ? 'Unlimited' : parseInt(e.target.value) }
            })}
          >
            {[1, 2, 3, 4, 5, 'Unlimited'].map(num => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        <div className="attribute">
          <label>Color:</label>
          <div 
            className="color-preview"
            style={{ backgroundColor: attrs.color }}
            onClick={() => setShowColorPicker(station.id)}
          />
          {showColorPicker === station.id && (
            <div className="color-picker-popover">
              <div className="color-picker-cover" onClick={() => setShowColorPicker(null)} />
              <ChromePicker
                color={attrs.color}
                onChange={(color) => handleUpdateStation(station.id, {
                  attributes: { ...attrs, color: color.hex }
                })}
              />
            </div>
          )}
        </div>

        <div className="attribute">
          <label>Certifications:</label>
          <select
            multiple
            value={attrs.requiresCertification || []}
            onChange={(e) => handleUpdateStation(station.id, {
              attributes: { ...attrs, requiresCertification: Array.from(e.target.selectedOptions, option => option.value) }
            })}
          >
            {['Pediatrics', 'Trauma', 'ICU', 'Emergency'].map(cert => (
              <option key={cert} value={cert}>{cert}</option>
            ))}
          </select>
        </div>

        <div className="attribute">
          <label>Overlap Allowed:</label>
          <input
            type="checkbox"
            checked={attrs.overlapAllowed}
            onChange={(e) => handleUpdateStation(station.id, {
              attributes: { ...attrs, overlapAllowed: e.target.checked }
            })}
          />
        </div>
      </div>
    );
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error-message">{error}</div>;

  return (
    <div className="worksheet-settings">
      <h2>Worksheet Settings</h2>
      <div className="stations-table">
        <div className="stations-header">
          <div className="move-column">Move</div>
          <div className="name-column">Station Name</div>
          <div className="code-column">Short Code</div>
          <div className="attributes-column">Attributes</div>
          <div className="actions-column">Actions</div>
        </div>

        {stations.map((station, index) => (
          <div key={station.id} className="station-row">
            <div className="move-column">
              <button
                className="move-button"
                onClick={() => handleMoveStation(index, 'up')}
                disabled={index === 0}
              >
                <MoveUpIcon />
              </button>
              <button
                className="move-button"
                onClick={() => handleMoveStation(index, 'down')}
                disabled={index === stations.length - 1}
              >
                <MoveDownIcon />
              </button>
            </div>

            <div className="name-column">
              <input
                type="text"
                value={station.name}
                onChange={(e) => handleUpdateStation(station.id, { name: e.target.value })}
              />
            </div>

            <div className="code-column">
              <input
                type="text"
                value={station.short_code}
                onChange={(e) => handleUpdateStation(station.id, { short_code: e.target.value })}
              />
            </div>

            <div className="attributes-column">
              {renderAttributes(station)}
            </div>

            <div className="actions-column">
              <button
                className="delete-button"
                onClick={() => handleDeleteStation(station.id)}
              >
                <DeleteIcon />
              </button>
            </div>
          </div>
        ))}

        <div className="add-station-row">
          <button className="add-button" onClick={handleAddStation}>
            ➕ Add New Station
          </button>
        </div>
      </div>
    </div>
  );
};

export default WorksheetSettings; 