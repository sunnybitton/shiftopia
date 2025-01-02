import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  if (!user.userName) {
    return null;
  }

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
            <NavLink to="/schedule" className={({ isActive }) => isActive ? 'active' : ''}>
              Schedule
            </NavLink>
          </li>
          {isManager && (
            <>
              <li>
                <NavLink to="/employees" className={({ isActive }) => isActive ? 'active' : ''}>
                  Employees
                </NavLink>
              </li>
              <li>
                <NavLink to="/messages" className={({ isActive }) => isActive ? 'active' : ''}>
                  Messages
                </NavLink>
              </li>
            </>
          )}
          <li>
            <NavLink to="/settings" className={({ isActive }) => isActive ? 'active' : ''}>
              Settings
            </NavLink>
          </li>
        </ul>
      </nav>
      <div className="nav-user">
        <span>Welcome, {user.firstName} {user.lastName}</span>
      </div>
      <div className="logout-container">
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </div>
    </div>
  );
};

export default Sidebar;