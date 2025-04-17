import React, { useState, useEffect } from 'react';
import { employeeOperations } from '../services/dbService';
import LoadingSpinner from './LoadingSpinner';
import './Employees.css';

// Icons as SVG components
const AddIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
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

const API_URL = import.meta.env.VITE_API_URL;

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [columnPreferences, setColumnPreferences] = useState({
    visibleColumns: ["name", "email", "role", "username", "phone"],
    columnOrder: ["name", "email", "role", "username", "phone"]
  });
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: '',
    phone: '',
    username: '',
    password: ''
  });

  // Column configuration
  const allColumns = [
    { id: 'name', label: 'Name', required: true },
    { id: 'email', label: 'Email', required: false },
    { id: 'role', label: 'Role', required: false },
    { id: 'username', label: 'Username', required: false },
    { id: 'phone', label: 'Phone', required: false }
  ];

  useEffect(() => {
    loadEmployees();
    
    // Get initial preferences from localStorage
    const storedPreferences = localStorage.getItem('columnPreferences');
    if (storedPreferences) {
      const preferences = JSON.parse(storedPreferences);
      // Filter out id fields and clean IDs
      const cleanedVisibleColumns = preferences.visibleColumns
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
      const cleanedColumnOrder = preferences.columnOrder
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
      setColumnPreferences({
        visibleColumns: cleanedVisibleColumns,
        columnOrder: cleanedColumnOrder
      });
    } else {
      fetchColumnPreferences();
    }

    // Listen for changes to column preferences
    const handleStorageChange = (e) => {
      if (e.key === 'columnPreferences' && e.newValue) {
        const preferences = JSON.parse(e.newValue);
        // Filter out id fields and clean IDs
        const cleanedVisibleColumns = preferences.visibleColumns
          .filter(col => col !== 'id')
          .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
        const cleanedColumnOrder = preferences.columnOrder
          .filter(col => col !== 'id')
          .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
        setColumnPreferences({
          visibleColumns: cleanedVisibleColumns,
          columnOrder: cleanedColumnOrder
        });
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []); // Only run on mount

  const fetchColumnPreferences = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/column-preferences`);
      if (!response.ok) throw new Error('Failed to fetch column preferences');
      const data = await response.json();
      // Filter out id fields and clean IDs
      const cleanedVisibleColumns = data.visibleColumns
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
      const cleanedColumnOrder = data.columnOrder
        .filter(col => col !== 'id')
        .map(col => col.replace(/[^a-zA-Z0-9_]/g, '_'));
      setColumnPreferences({
        visibleColumns: cleanedVisibleColumns,
        columnOrder: cleanedColumnOrder
      });
      localStorage.setItem('columnPreferences', JSON.stringify(columnPreferences));
    } catch (err) {
      console.error('Error fetching column preferences:', err);
    }
  };

  const loadEmployees = async () => {
    try {
      setLoading(true);
      console.log('Fetching employees...');
      const data = await employeeOperations.getAllEmployees();
      console.log('Received employees:', data);
      setEmployees(data || []);
    } catch (err) {
      console.error('Error loading employees:', err);
      setError(err.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      await employeeOperations.createEmployee(newEmployee);
      setShowAddForm(false);
      setNewEmployee({
        name: '',
        email: '',
        role: '',
        phone: '',
        username: '',
        password: ''
      });
      await loadEmployees();
    } catch (err) {
      if (err.message.includes('email is already taken')) {
        setError('An employee with this email already exists');
      } else {
        setError('Failed to add employee: ' + err.message);
      }
    }
  };

  const handleUpdateEmployee = async (e) => {
    e.preventDefault();
    try {
      await employeeOperations.updateEmployee(editingEmployee.id, editingEmployee);
      setEditingEmployee(null);
      await loadEmployees();
    } catch (err) {
      setError('Failed to update employee: ' + err.message);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        setLoading(true);
        await employeeOperations.deleteEmployee(id);
        // Remove the employee from the local state
        setEmployees(employees.filter(emp => emp.id !== id));
      } catch (err) {
        console.error('Error deleting employee:', err);
        setError('Failed to delete employee: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const getColumnLabel = (columnId) => {
    const labels = {
      name: 'Name',
      email: 'Email',
      role: 'Role',
      phone: 'Phone',
      username: 'Username'
    };
    return labels[columnId] || columnId;
  };

  const renderEmployeeForm = (employee, onSubmit, onCancel) => {
    // Define allowed fields explicitly
    const allowedFields = ['name', 'email', 'role', 'username', 'phone'];
    
    // When editing (onCancel exists), show all fields regardless of visibility settings
    const fieldsToShow = onCancel 
      ? allowedFields
      : columnPreferences.columnOrder.filter(columnId => 
          allowedFields.includes(columnId) && columnId !== 'id'
        );

    return (
      <form onSubmit={onSubmit} className="employee-form">
        {fieldsToShow.map(columnId => (
          <input
            key={columnId}
            type={columnId === 'email' ? 'email' : columnId === 'phone' ? 'tel' : 'text'}
            placeholder={getColumnLabel(columnId)}
            value={employee[columnId] || ''}
            onChange={(e) => {
              const updatedEmployee = onCancel
                ? { ...editingEmployee, [columnId]: e.target.value }
                : { ...newEmployee, [columnId]: e.target.value };
              
              onCancel
                ? setEditingEmployee(updatedEmployee)
                : setNewEmployee(updatedEmployee);
            }}
            required={columnId === 'name' || columnId === 'email'}
          />
        ))}
        {!onCancel && (
          <input
            type="password"
            placeholder="Initial Password"
            value={employee.password || ''}
            onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
            required
            autoComplete="new-password"
          />
        )}
        <div className="form-buttons">
          <button type="submit" className="submit-button">
            {onCancel ? 'Update' : 'Add'} Employee
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className="cancel-button">
              Cancel
            </button>
          )}
        </div>
      </form>
    );
  };

  if (loading) {
    return <LoadingSpinner text="Loading employees..." />;
  }

  if (error) {
    return (
      <div className="employees error">
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => {
            setError(null);
            loadEmployees();
          }}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="employees">
      <div className="employees-header">
        <h1>Employees</h1>
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="icon-button add-button"
          title={showAddForm ? "Cancel" : "Add Employee"}
        >
          <AddIcon />
        </button>
      </div>

      {showAddForm && (
        <div className="add-employee-form">
          <h2>Add New Employee</h2>
          {renderEmployeeForm(newEmployee, handleAddEmployee)}
        </div>
      )}

      <div className="employees-list">
        {employees.length > 0 ? (
          <table>
            <thead>
              <tr>
                {columnPreferences.columnOrder
                  .filter(columnId => columnPreferences.visibleColumns.includes(columnId))
                  .map(columnId => (
                    <th key={columnId}>{getColumnLabel(columnId)}</th>
                  ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id || employee.email}>
                  {editingEmployee && editingEmployee.id === employee.id ? (
                    <td colSpan={columnPreferences.visibleColumns.length + 1}>
                      {renderEmployeeForm(
                        editingEmployee,
                        handleUpdateEmployee,
                        () => setEditingEmployee(null)
                      )}
                    </td>
                  ) : (
                    <>
                      {columnPreferences.columnOrder
                        .filter(columnId => columnPreferences.visibleColumns.includes(columnId))
                        .map(columnId => (
                          <td key={columnId}>{employee[columnId]}</td>
                        ))}
                      <td className="action-buttons">
                        <button
                          onClick={() => setEditingEmployee({...employee})}
                          className="icon-button edit-button"
                          title="Edit Employee"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDeleteEmployee(employee.id)}
                          className="icon-button delete-button"
                          title="Delete Employee"
                        >
                          <DeleteIcon />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No employees found</p>
        )}
      </div>
    </div>
  );
};

export default Employees; 