import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    // Clear user data
    localStorage.removeItem('user');
    // Force a page reload and redirect to login
    window.location.href = '/login';
  };

  return (
    <div className="sidebar">
      <div className="logo-container">
        <img src="/src/assets/logo.png" alt="Logo" className="logo" />
      </div>
      <nav className="sidebar-nav">
        <ul>
          <li>
            <NavLink to="/" className={({ isActive }) => isActive ? 'active' : ''}>
              Dashboard
            </NavLink>
          </li>
          <li>
            <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>
              Employees
            </NavLink>
          </li>
          <li>
            <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>
              Schedule
            </NavLink>
          </li>
          <li>
            <NavLink to="/messages" className={({ isActive }) => isActive ? 'active' : ''}>
              Messages
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="logout-container">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;