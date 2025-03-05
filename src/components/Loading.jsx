import React, { useEffect } from 'react';
import './Loading.css';

const Loading = ({ size = 100, color = "#39587F" }) => {
  useEffect(() => {
    // Load the Lordicon script if it hasn't been loaded yet
    if (!document.querySelector('script[src="https://cdn.lordicon.com/lordicon.js"]')) {
      const script = document.createElement('script');
      script.src = "https://cdn.lordicon.com/lordicon.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  return (
    <div className="loading-container">
      <lord-icon
        src="https://cdn.lordicon.com/abfverha.json"
        trigger="loop"
        delay="0"
        colors={`primary:${color}`}
        style={{
          width: `${size}px`,
          height: `${size}px`
        }}
      />
    </div>
  );
};

export default Loading; 