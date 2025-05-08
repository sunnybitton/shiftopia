import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import Login from './components/Login';
import Messages from './components/Messages';
import Worksheets from './components/Worksheets';
import MobileNavigation from './components/MobileNavigation';
import ErrorBoundary from './components/ErrorBoundary';
import Requests from './components/Requests';
import './App.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('user');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Redirect non-managers trying to access restricted routes
  const ManagerRoute = ({ children }) => {
    return isManager ? children : <Navigate to="/" />;
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
          />
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <div className="app">
                  {!isMobile && <Sidebar />}
                  <main className={`main-content ${isMobile ? 'mobile' : ''}`}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route 
                        path="/employees" 
                        element={
                          <ManagerRoute>
                            <Employees />
                          </ManagerRoute>
                        } 
                      />
                      <Route path="/schedule" element={<Schedule />} />
                      <Route path="/requests" element={<Requests />} />
                      <Route 
                        path="/messages" 
                        element={
                          <ManagerRoute>
                            <Messages />
                          </ManagerRoute>
                        } 
                      />
                      <Route path="/settings" element={<Settings />} />
                      <Route 
                        path="/worksheets" 
                        element={
                          <ManagerRoute>
                            <Worksheets />
                          </ManagerRoute>
                        } 
                      />
                    </Routes>
                  </main>
                  {isMobile && <MobileNavigation isManager={isManager} />}
                </div>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;