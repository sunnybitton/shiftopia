import React from 'react';
import './LoadingSpinner.css';

const LoadingSpinner = ({ text = "Loading...", size = "large" }) => {
  const dimensions = {
    small: '80px',
    medium: '150px',
    large: '250px'
  };

  const spinnerSize = dimensions[size] || dimensions.large;

  return (
    <div className={`loading-container ${size}`}>
      <lord-icon
        src="https://cdn.lordicon.com/abfverha.json"
        trigger="loop"
        colors="primary:#39587f"
        style={{ width: spinnerSize, height: spinnerSize }}>
      </lord-icon>
      <p>{text}</p>
    </div>
  );
};

export default LoadingSpinner; 