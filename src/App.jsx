import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Employees from './components/Employees';
import Schedule from './components/Schedule';
import Settings from './components/Settings';
import Login from './components/Login';
import Messages from './components/Messages';
import './App.css';

function App() {
  const isAuthenticated = !!localStorage.getItem('user');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManager = user.role?.toLowerCase() === 'manager';

  // Redirect non-managers trying to access restricted routes
  const ManagerRoute = ({ children }) => {
    return isManager ? children : <Navigate to="/" />;
  };

  return (
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
                <Sidebar />
                <main className="main-content">
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
                    <Route 
                      path="/messages" 
                      element={
                        <ManagerRoute>
                          <Messages />
                        </ManagerRoute>
                      } 
                    />
                    <Route path="/settings" element={<Settings />} />
                  </Routes>
                </main>
              </div>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;