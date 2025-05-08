import React, { useState, useEffect } from 'react';
import { getToken } from '../services/auth.js';

const REQUEST_TYPES = [
  { value: 'day_off', label: 'Day Off' },
  { value: 'no_night_shift', label: 'No Night Shift' },
  // Add more types as needed
];

const API_URL = import.meta.env.VITE_API_URL;

const Requests = ({ isManager = false, employees = [] }) => {
  // Form state
  const [requestType, setRequestType] = useState('');
  const [singleOrMultiple, setSingleOrMultiple] = useState('single');
  const [date, setDate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [note, setNote] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requests, setRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Fetch requests on mount and after submit/approve/deny
  const fetchRequests = async () => {
    setLoadingRequests(true);
    setError('');
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/requests`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to fetch requests');
        setLoadingRequests(false);
        return;
      }
      const data = await response.json();
      setRequests(data);
    } catch (err) {
      setError('Failed to fetch requests');
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line
  }, []);

  // Validation
  const isFormValid = () => {
    if (!requestType) return false;
    if (isManager && !selectedEmployee) return false;
    if (singleOrMultiple === 'single' && !date) return false;
    if (singleOrMultiple === 'multiple' && (!startDate || !endDate)) return false;
    if (note.length > 120) return false;
    return true;
  };

  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);
    try {
      const token = getToken();
      const body = {
        type: requestType,
        single_or_multiple: singleOrMultiple,
        note,
      };
      if (singleOrMultiple === 'single') {
        body.date = date;
      } else {
        body.start_date = startDate;
        body.end_date = endDate;
      }
      if (isManager) {
        body.employee_id = selectedEmployee;
      }
      const response = await fetch(`${API_URL}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to submit request');
        setSubmitting(false);
        return;
      }
      setSuccess('Request submitted!');
      setError('');
      setDate('');
      setStartDate('');
      setEndDate('');
      setNote('');
      setRequestType('');
      setSingleOrMultiple('single');
      setSelectedEmployee('');
      fetchRequests();
    } catch (err) {
      setError('Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve/Deny handlers (manager only)
  const handleApprove = async (id) => {
    setError('');
    setSuccess('');
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/requests/${id}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to approve request');
        return;
      }
      setSuccess('Request approved');
      fetchRequests();
    } catch (err) {
      setError('Failed to approve request');
    }
  };

  const handleDeny = async (id) => {
    setError('');
    setSuccess('');
    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/requests/${id}/deny`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || 'Failed to deny request');
        return;
      }
      setSuccess('Request denied');
      fetchRequests();
    } catch (err) {
      setError('Failed to deny request');
    }
  };

  return (
    <div className="requests-page" style={{ maxWidth: 480, margin: '0 auto', padding: 24, fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif' }}>
      <h1 style={{ textAlign: 'center', marginBottom: 24, color: '#333', fontWeight: 500 }}>Time off request</h1>
      <form onSubmit={handleSubmit}>
        {/* Section 1: What kind of request? */}
        <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
          <h2 style={{ fontSize: 18, margin: 0, marginBottom: 12, color: '#333', fontWeight: 500 }}>What kind of request?</h2>
          {isManager && (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontWeight: 500, color: '#39587F' }}>Employee</label>
              <select
                value={selectedEmployee}
                onChange={e => setSelectedEmployee(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
                required
              >
                <option value="">Select employee</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
          )}
          <label style={{ fontWeight: 500, color: '#39587F' }}>Policy<span style={{ color: '#d32f2f' }}>*</span></label>
          <select
            value={requestType}
            onChange={e => setRequestType(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
            required
          >
            <option value="">Select type</option>
            {REQUEST_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Section 2: When? */}
        <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
          <h2 style={{ fontSize: 18, margin: 0, marginBottom: 12, color: '#333', fontWeight: 500 }}>When?</h2>
          <label style={{ fontWeight: 500, color: '#39587F' }}>Single or multiple days<span style={{ color: '#d32f2f' }}>*</span></label>
          <select
            value={singleOrMultiple}
            onChange={e => setSingleOrMultiple(e.target.value)}
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, marginBottom: 12, fontSize: 15, color: '#333', background: 'white' }}
          >
            <option value="single">Single day</option>
            <option value="multiple">Multiple days</option>
          </select>
          {singleOrMultiple === 'single' ? (
            <div>
              <label style={{ fontWeight: 500, color: '#39587F' }}>Date<span style={{ color: '#d32f2f' }}>*</span></label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
                required
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500, color: '#39587F' }}>Start date<span style={{ color: '#d32f2f' }}>*</span></label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
                  required
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontWeight: 500, color: '#39587F' }}>End date<span style={{ color: '#d32f2f' }}>*</span></label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
                  required
                />
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Anything to add? */}
        <div style={{ background: '#f5f7fa', padding: 16, borderRadius: 12, marginBottom: 24, boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #eee' }}>
          <h2 style={{ fontSize: 18, margin: 0, marginBottom: 12, color: '#333', fontWeight: 500 }}>Anything to add?</h2>
          <label style={{ fontWeight: 500, color: '#39587F' }}>Note</label>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value.slice(0, 120))}
            placeholder="Add note"
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e0e0e0', minHeight: 48, resize: 'vertical', marginTop: 4, fontSize: 15, color: '#333', background: 'white' }}
            maxLength={120}
          />
          <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>{note.length}/120</div>
        </div>

        {error && <div style={{ color: '#d32f2f', marginBottom: 12 }}>{error}</div>}
        {success && <div style={{ color: '#388e3c', marginBottom: 12 }}>{success}</div>}
        <button
          type="submit"
          disabled={!isFormValid() || submitting}
          style={{
            width: '100%',
            background: '#39587F',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: 14,
            fontSize: 18,
            fontWeight: 500,
            cursor: !isFormValid() || submitting ? 'not-allowed' : 'pointer',
            opacity: !isFormValid() || submitting ? 0.7 : 1,
            marginBottom: 8,
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}
        >
          {submitting ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Requests List */}
      <div style={{ marginTop: 32 }}>
        <h2 style={{ fontSize: 18, color: '#333', fontWeight: 500, marginBottom: 12 }}>Your Requests</h2>
        {loadingRequests ? (
          <div>Loading requests...</div>
        ) : requests.length === 0 ? (
          <div>No requests found.</div>
        ) : (
          <table style={{ width: '100%', background: '#fff', borderRadius: 8, border: '1px solid #eee', boxShadow: '0 2px 4px rgba(0,0,0,0.03)', fontSize: 15 }}>
            <thead>
              <tr style={{ background: '#f5f7fa' }}>
                {isManager && <th style={{ padding: 8, color: '#39587F' }}>Employee</th>}
                <th style={{ padding: 8, color: '#39587F' }}>Type</th>
                <th style={{ padding: 8, color: '#39587F' }}>When</th>
                <th style={{ padding: 8, color: '#39587F' }}>Note</th>
                <th style={{ padding: 8, color: '#39587F' }}>Status</th>
                {isManager && <th style={{ padding: 8, color: '#39587F' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} style={{ borderBottom: '1px solid #eee' }}>
                  {isManager && <td style={{ padding: 8 }}>{req.employee_name}</td>}
                  <td style={{ padding: 8 }}>{REQUEST_TYPES.find(t => t.value === req.type)?.label || req.type}</td>
                  <td style={{ padding: 8 }}>
                    {req.single_or_multiple === 'single'
                      ? req.date
                      : `${req.start_date} - ${req.end_date}`}
                  </td>
                  <td style={{ padding: 8 }}>{req.note}</td>
                  <td style={{ padding: 8 }}>
                    {req.status === 'pending' && <span style={{ color: '#e65100' }}>Pending</span>}
                    {req.status === 'approved' && <span style={{ color: '#388e3c' }}>Approved</span>}
                    {req.status === 'denied' && <span style={{ color: '#d32f2f' }}>Denied</span>}
                  </td>
                  {isManager && (
                    <td style={{ padding: 8 }}>
                      {req.status === 'pending' && (
                        <>
                          <button onClick={() => handleApprove(req.id)} style={{ marginRight: 8, background: '#388e3c', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>Approve</button>
                          <button onClick={() => handleDeny(req.id)} style={{ background: '#d32f2f', color: '#fff', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}>Deny</button>
                        </>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Requests; 