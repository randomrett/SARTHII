import React from 'react';

interface ZoneTagProps {
  zone: string;
  className?: string;
}

export const ZoneTag: React.FC<ZoneTagProps> = ({ zone, className = '' }) => {
  return (
    <span className={`px-2 py-0.5 rounded bg-surface-container text-on-surface font-mono text-xs font-semibold uppercase tracking-wider ${className}`}>
      [{zone}]
    </span>
  );
};
