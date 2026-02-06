import { ReactNode } from 'react';

interface ThreeBackgroundProps {
  children: ReactNode;
  isActive: boolean;
}

export function ThreeBackground({ children, isActive }: ThreeBackgroundProps) {
  return (
    <div 
      className={`absolute inset-0 z-0 grid-bg transition-all duration-700 ${
        isActive ? 'opacity-100 scale-100' : 'opacity-30 scale-105 blur-[2px]'
      }`}
    >
      {children}
    </div>
  );
}
