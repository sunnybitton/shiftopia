import React, { useState, useEffect } from 'react';
import { employeeOperations } from '../services/dbService';
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

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    role: '',
    worker_id: '',
    phone: '',
    username: ''
  });

  useEffect(() => {
    loadEmployees();
  }, []);

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
        worker_id: '',
        phone: '',
        username: ''
      });
      await loadEmployees();
    } catch (err) {
      setError('Failed to add employee: ' + err.message);
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

  const renderEmployeeForm = (employee, onSubmit, onCancel) => (
    <form onSubmit={onSubmit} className="employee-form">
      <input
        type="text"
        placeholder="Name"
        value={employee.name || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, name: e.target.value}) :
          setNewEmployee({...newEmployee, name: e.target.value})}
        required
      />
      <input
        type="email"
        placeholder="Email"
        value={employee.email || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, email: e.target.value}) :
          setNewEmployee({...newEmployee, email: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Role"
        value={employee.role || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, role: e.target.value}) :
          setNewEmployee({...newEmployee, role: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Worker ID"
        value={employee.worker_id || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, worker_id: e.target.value}) :
          setNewEmployee({...newEmployee, worker_id: e.target.value})}
        required
      />
      <input
        type="tel"
        placeholder="Phone"
        value={employee.phone || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, phone: e.target.value}) :
          setNewEmployee({...newEmployee, phone: e.target.value})}
        required
      />
      <input
        type="text"
        placeholder="Username"
        value={employee.username || ''}
        onChange={(e) => onCancel ? 
          setEditingEmployee({...editingEmployee, username: e.target.value}) :
          setNewEmployee({...newEmployee, username: e.target.value})}
        required
      />
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

  if (loading) {
    return (
      <div className="employees loading">
        <div className="loading-spinner"></div>
        <p>Loading employees...</p>
      </div>
    );
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
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Worker ID</th>
                <th>Phone</th>
                <th>Username</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id || employee.email}>
                  {editingEmployee && editingEmployee.id === employee.id ? (
                    <td colSpan="7">
                      {renderEmployeeForm(
                        editingEmployee,
                        handleUpdateEmployee,
                        () => setEditingEmployee(null)
                      )}
                    </td>
                  ) : (
                    <>
                      <td>{employee.name}</td>
                      <td>{employee.email}</td>
                      <td>{employee.role}</td>
                      <td>{employee.worker_id}</td>
                      <td>{employee.phone}</td>
                      <td>{employee.username}</td>
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