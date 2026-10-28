import React from 'react';

export default function LoadingSpinner({ message = 'Loading operational data...', fullScreen = false }) {
  const containerClass = fullScreen
    ? 'd-flex flex-column justify-content-center align-items-center vh-100 bg-light'
    : 'd-flex flex-column justify-content-center align-items-center py-5';

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className="spinner-border text-primary mb-3" style={{ width: '2.5rem', height: '2.5rem' }} />
      <span className="text-secondary fw-medium small">{message}</span>
    </div>
  );
}
