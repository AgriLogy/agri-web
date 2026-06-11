import React from 'react';
import './LoadingSpinner.css'; // Add styles in this file

const LoadingSpinner: React.FC = () => {
  return (
    <div className="loading-spinner">
      <div className="spinner"></div>
    </div>
  );
};

export default LoadingSpinner;
