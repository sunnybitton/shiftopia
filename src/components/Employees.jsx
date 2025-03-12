import React, { useState, useEffect } from 'react';
import { employeeOperations } from '../services/dbService';
import './Employees.css';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
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

    loadEmployees();
  }, []);

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
        <h2>Error Loading Employees</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="retry-button"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="employees">
      <h1>Employees</h1>
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
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id || employee.email}>
                  <td>{employee.name}</td>
                  <td>{employee.email}</td>
                  <td>{employee.role}</td>
                  <td>{employee.worker_id}</td>
                  <td>{employee.phone}</td>
                  <td>{employee.username}</td>
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