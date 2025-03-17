import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <Link to="/">Shiftopia</Link>
      </div>
      <div className="nav-menu">
        <Link to="/" className="nav-link">Schedule</Link>
        {isManager && <Link to="/worksheets" className="nav-link">Worksheets</Link>}
        <Link to="/settings" className="nav-link">Settings</Link>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </div>
    </nav>
  );
};

export default Navbar; 