'use client';

import { useMemo } from 'react';

export function Starfield({ count = 200 }: { count?: number }) {
  const stars = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: Math.random() < 0.1 ? 2 : 1,
      dur: `${3 + Math.random() * 5}s`,
      delay: `${Math.random() * 5}s`,
      minOp: 0.1 + Math.random() * 0.2,
      maxOp: 0.5 + Math.random() * 0.5,
    }));
  }, [count]);

  return (
    <div className="starfield">
      {stars.map((s) => (
        <div
          key={s.id}
          className="star"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            '--dur': s.dur,
            '--delay': s.delay,
            '--min-op': s.minOp,
            '--max-op': s.maxOp,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
