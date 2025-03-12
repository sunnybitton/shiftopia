import React from 'react';

const Loading = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    width: '100vw'
  }}>
    <div style={{
      textAlign: 'center'
    }}>
      <div className="loading-spinner"></div>
      <p>Loading...</p>
    </div>
  </div>
);

export default Loading; 