'use client';

export function NebulaBg() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      {/* Large nebula clouds */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full orb-pulse orb-drift"
        style={{
          top: '-15%',
          right: '-10%',
          background: 'radial-gradient(circle, rgba(123, 47, 190, 0.08) 0%, rgba(45, 91, 255, 0.03) 40%, transparent 70%)',
          filter: 'blur(60px)',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full orb-pulse orb-drift"
        style={{
          bottom: '-10%',
          left: '-5%',
          background: 'radial-gradient(circle, rgba(45, 91, 255, 0.06) 0%, rgba(0, 255, 136, 0.02) 40%, transparent 70%)',
          filter: 'blur(50px)',
          animationDelay: '3s',
        }}
      />
      <div
        className="absolute w-[500px] h-[400px] rounded-full orb-pulse"
        style={{
          top: '40%',
          left: '30%',
          background: 'radial-gradient(ellipse, rgba(230, 0, 122, 0.04) 0%, transparent 60%)',
          filter: 'blur(40px)',
          animationDelay: '6s',
        }}
      />
      {/* Small bright nebula core */}
      <div
        className="absolute w-[200px] h-[200px] rounded-full orb-pulse"
        style={{
          top: '20%',
          left: '60%',
          background: 'radial-gradient(circle, rgba(123, 47, 190, 0.12) 0%, transparent 50%)',
          filter: 'blur(30px)',
          animationDelay: '1.5s',
        }}
      />
    </div>
  );
}
