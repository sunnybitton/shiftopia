import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import PeopleIcon from '@mui/icons-material/People';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Message';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import './MobileNavigation.css';

const MobileNavigation = ({ isManager }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);

  const mainNavItems = [
    { path: '/', icon: <HomeIcon />, label: 'Home' },
    { path: '/schedule', icon: <CalendarMonthIcon />, label: 'Schedule' },
  ];

  const menuItems = [
    ...(isManager ? [
      { path: '/employees', icon: <PeopleIcon />, label: 'Employees' },
      { path: '/messages', icon: <MessageIcon />, label: 'Messages' },
    ] : []),
    { path: '/settings', icon: <SettingsIcon />, label: 'Settings' },
  ];

  const handleNavigation = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="mobile-navigation">
        {mainNavItems.map((item) => (
          <button
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => handleNavigation(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
        <button
          className={`nav-item ${menuOpen ? 'active' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <MenuIcon />
          <span>Menu</span>
        </button>
      </nav>

      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            {menuItems.map((item) => (
              <button
                key={item.path}
                className={`menu-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => handleNavigation(item.path)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default MobileNavigation; 