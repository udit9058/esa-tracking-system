import React from 'react';

const STATUS_VARIANTS = {
  completed: 'bg-success-subtle text-success border border-success-subtle',
  submitted: 'bg-success-subtle text-success border border-success-subtle',
  ready: 'bg-success-subtle text-success border border-success-subtle',
  active: 'bg-primary-subtle text-primary border border-primary-subtle',
  pending: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
  in_progress: 'bg-info-subtle text-info-emphasis border border-info-subtle',
  discrepancy: 'bg-danger-subtle text-danger border border-danger-subtle',
  flagged: 'bg-danger-subtle text-danger border border-danger-subtle',
  overdue: 'bg-danger text-white',
  inactive: 'bg-secondary-subtle text-secondary border border-secondary-subtle',
};

export default function StatusBadge({ status = 'pending', label }) {
  const normalizedKey = String(status).toLowerCase().replace(/\s+/g, '_');
  const badgeClass = STATUS_VARIANTS[normalizedKey] || STATUS_VARIANTS.pending;
  const displayText = label || String(status).replace(/_/g, ' ').toUpperCase();

  return (
    <span className={`badge rounded-pill px-2 py-1 fw-semibold ${badgeClass}`} style={{ fontSize: '0.75rem' }}>
      {displayText}
    </span>
  );
}
