import React from 'react';
import './LoadingLeaf.css';

const LoadingLeaf: React.FC = () => {
  return (
    <div className="loading-leaf">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100"
        height="100"
        viewBox="0 0 100 100"
      >
        <path
          d="M50 10 C 60 20, 80 30, 50 90 C 20 30, 40 20, 50 10"
          fill="green"
          className="leaf"
        />
      </svg>
    </div>
  );
};

export default LoadingLeaf;
