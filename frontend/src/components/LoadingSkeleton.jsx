import React from 'react';

export function CardSkeleton({ lines = 3 }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid rgba(207, 216, 237, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: '12px',
            width: i === 0 ? '60%' : '100%',
            borderRadius: '4px'
          }}
        />
      ))}
    </div>
  );
}

export function ButtonSkeleton() {
  return (
    <div
      className="skeleton"
      style={{
        height: '36px',
        width: '100%',
        borderRadius: '8px'
      }}
    />
  );
}

export function ChartSkeleton() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
      borderRadius: '16px',
      padding: '16px',
      border: '1px solid rgba(207, 216, 237, 0.3)',
      height: '220px',
      display: 'flex',
      alignItems: 'flex-end',
      gap: '8px',
      justifyContent: 'space-around'
    }}>
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            width: '8%',
            height: `${Math.random() * 60 + 40}px`,
            borderRadius: '4px'
          }}
        />
      ))}
    </div>
  );
}

export default { CardSkeleton, ButtonSkeleton, ChartSkeleton };