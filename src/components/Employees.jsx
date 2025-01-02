import React, { useState, useEffect } from 'react';
import { fetchSheetData } from '../services/sheetsService';
import './Employees.css';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await fetchSheetData('employee_data');
        // Map data according to the correct column structure
        const employeeData = data.slice(1).map(row => ({
          firstName: row[0],
          lastName: row[1],
          email: row[2],
          phoneNumber: row[3],
          workerId: row[4],
          userName: row[6],
          role: row[7]
        }));
        setEmployees(employeeData);
      } catch (err) {
        console.error('Error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadEmployees();
  }, []);

  if (loading) {
    return <div className="employees">Loading employees...</div>;
  }

  if (error) {
    return <div className="employees">Error: {error}</div>;
  }

  return (
    <div className="employees">
      <h1>Employees</h1>
      <div className="employees-list">
        {employees.length > 0 ? (
          <table>
            <thead>
              <tr>
                <th>First Name</th>
                <th>Last Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Worker ID</th>
                <th>Username</th>
                <th>Role</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee, index) => (
                <tr key={index}>
                  <td>{employee.firstName}</td>
                  <td>{employee.lastName}</td>
                  <td>{employee.email}</td>
                  <td>{employee.phoneNumber}</td>
                  <td>{employee.workerId}</td>
                  <td>{employee.userName}</td>
                  <td>{employee.role}</td>
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