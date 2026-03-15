export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@300;400;500;600&family=Unbounded:wght@400;600;700;800;900&display=swap');

  :root {
    --void: #030014;
    --deep: #0B0720;
    --nebula-purple: #7B2FBE;
    --nebula-blue: #2D5BFF;
    --nebula-pink: #E6007A;
    --star-white: #E8E4F0;
    --aurora-green: #00FF88;
    --aurora-cyan: #00D4FF;
    --stellar-gold: #FFB800;
    --card: rgba(11, 7, 32, 0.82);
    --card-light: rgba(20, 14, 50, 0.6);
    --border: rgba(123, 47, 190, 0.12);
    --border-hover: rgba(123, 47, 190, 0.35);
  }

  .font-display { font-family: 'Unbounded', sans-serif; }
  .font-body { font-family: 'Outfit', sans-serif; }
  .font-data { font-family: 'JetBrains Mono', monospace; }

  /* ═══════════════════════════════════════
     GLASS PANELS
  ═══════════════════════════════════════ */
  .glass-panel {
    background: var(--card);
    backdrop-filter: blur(30px) saturate(1.5);
    -webkit-backdrop-filter: blur(30px) saturate(1.5);
    border: 1px solid var(--border);
    box-shadow:
      0 0 0 1px rgba(123, 47, 190, 0.04) inset,
      0 4px 30px rgba(0, 0, 0, 0.6),
      0 0 100px rgba(123, 47, 190, 0.03);
  }

  .glass-panel-hover {
    transition: border-color 0.4s ease, box-shadow 0.4s ease;
  }
  .glass-panel-hover:hover {
    border-color: var(--border-hover);
    box-shadow:
      0 0 0 1px rgba(123, 47, 190, 0.08) inset,
      0 4px 30px rgba(0, 0, 0, 0.6),
      0 0 60px rgba(123, 47, 190, 0.08);
  }

  /* ═══════════════════════════════════════
     ANIMATED GRADIENT BORDER
  ═══════════════════════════════════════ */
  .gradient-border {
    position: relative;
    border-radius: 1.5rem;
    padding: 1px;
    background: linear-gradient(
      135deg,
      rgba(123, 47, 190, 0.4) 0%,
      rgba(45, 91, 255, 0.15) 30%,
      rgba(0, 255, 136, 0.1) 60%,
      rgba(123, 47, 190, 0.3) 100%
    );
    background-size: 300% 300%;
    animation: nebulaBorder 10s ease infinite;
  }

  @keyframes nebulaBorder {
    0%, 100% { background-position: 0% 50%; }
    33% { background-position: 100% 0%; }
    66% { background-position: 50% 100%; }
  }

  /* ═══════════════════════════════════════
     TEXT EFFECTS
  ═══════════════════════════════════════ */
  .neon-text {
    text-shadow:
      0 0 8px rgba(123, 47, 190, 0.6),
      0 0 25px rgba(123, 47, 190, 0.3),
      0 0 50px rgba(123, 47, 190, 0.1);
  }

  .neon-text-green {
    text-shadow:
      0 0 8px rgba(0, 255, 136, 0.5),
      0 0 25px rgba(0, 255, 136, 0.2);
  }

  .stat-value {
    background: linear-gradient(135deg, #ffffff 0%, #7B2FBE 60%, #2D5BFF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .stat-value-green {
    background: linear-gradient(135deg, #00FF88 0%, #00D4FF 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  /* ═══════════════════════════════════════
     GALAXY BACKGROUNDS
  ═══════════════════════════════════════ */
  .grid-bg {
    background-image:
      radial-gradient(ellipse at 15% 85%, rgba(123, 47, 190, 0.08) 0%, transparent 45%),
      radial-gradient(ellipse at 85% 15%, rgba(45, 91, 255, 0.06) 0%, transparent 45%),
      radial-gradient(ellipse at 50% 50%, rgba(123, 47, 190, 0.04) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 70%, rgba(0, 255, 136, 0.02) 0%, transparent 40%);
  }

  /* Noise grain texture */
  .noise-overlay::before {
    content: '';
    position: fixed;
    inset: 0;
    opacity: 0.02;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    pointer-events: none;
    z-index: 100;
  }

  /* ═══════════════════════════════════════
     STARFIELD (pure CSS)
  ═══════════════════════════════════════ */
  .starfield {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 1;
    overflow: hidden;
  }

  .starfield .star {
    position: absolute;
    width: 1px;
    height: 1px;
    background: white;
    border-radius: 50%;
    animation: twinkle var(--dur) ease-in-out infinite;
    animation-delay: var(--delay);
  }

  @keyframes twinkle {
    0%, 100% { opacity: var(--min-op); transform: scale(1); }
    50% { opacity: var(--max-op); transform: scale(1.5); }
  }

  /* ═══════════════════════════════════════
     SCROLLBAR
  ═══════════════════════════════════════ */
  .custom-scrollbar::-webkit-scrollbar { width: 3px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, var(--nebula-purple), var(--aurora-cyan));
    border-radius: 3px;
  }

  /* ═══════════════════════════════════════
     ENTRY ANIMATIONS
  ═══════════════════════════════════════ */
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-fadeIn { animation: fadeIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(28px) scale(0.97); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-fadeInUp { animation: fadeInUp 0.8s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  @keyframes slideInRight {
    from { opacity: 0; transform: translateX(40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-slideInRight { animation: slideInRight 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  @keyframes slideInLeft {
    from { opacity: 0; transform: translateX(-40px); }
    to { opacity: 1; transform: translateX(0); }
  }
  .animate-slideInLeft { animation: slideInLeft 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  @keyframes scaleIn {
    from { opacity: 0; transform: scale(0.9); }
    to { opacity: 1; transform: scale(1); }
  }
  .animate-scaleIn { animation: scaleIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards; }

  /* Stagger delays */
  .stagger-1 { animation-delay: 0.05s; opacity: 0; }
  .stagger-2 { animation-delay: 0.1s; opacity: 0; }
  .stagger-3 { animation-delay: 0.15s; opacity: 0; }
  .stagger-4 { animation-delay: 0.2s; opacity: 0; }
  .stagger-5 { animation-delay: 0.25s; opacity: 0; }
  .stagger-6 { animation-delay: 0.3s; opacity: 0; }

  /* ═══════════════════════════════════════
     ORB / GLOW ANIMATIONS
  ═══════════════════════════════════════ */
  @keyframes orbPulse {
    0%, 100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.15); }
  }
  .orb-pulse { animation: orbPulse 5s ease-in-out infinite; }

  @keyframes orbDrift {
    0%, 100% { transform: translate(0, 0); }
    25% { transform: translate(10px, -15px); }
    50% { transform: translate(-5px, 10px); }
    75% { transform: translate(15px, 5px); }
  }
  .orb-drift { animation: orbDrift 20s ease-in-out infinite; }

  /* ═══════════════════════════════════════
     SHIMMER / SKELETON
  ═══════════════════════════════════════ */
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  .shimmer {
    background: linear-gradient(90deg, transparent 30%, rgba(123, 47, 190, 0.06) 50%, transparent 70%);
    background-size: 200% 100%;
    animation: shimmer 2.5s ease-in-out infinite;
  }

  /* ═══════════════════════════════════════
     GLOWING DIVIDER
  ═══════════════════════════════════════ */
  .glow-divider {
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--nebula-purple), var(--nebula-blue), transparent);
    opacity: 0.25;
  }

  /* ═══════════════════════════════════════
     BUTTONS
  ═══════════════════════════════════════ */
  .btn-press {
    transition: transform 0.1s ease, box-shadow 0.3s ease;
  }
  .btn-press:active {
    transform: scale(0.97);
  }

  .btn-galaxy {
    background: linear-gradient(135deg, #7B2FBE 0%, #2D5BFF 50%, #7B2FBE 100%);
    background-size: 200% 200%;
    transition: background-position 0.5s ease, box-shadow 0.3s ease;
    box-shadow: 0 0 25px rgba(123, 47, 190, 0.3);
  }
  .btn-galaxy:hover {
    background-position: 100% 0%;
    box-shadow: 0 0 40px rgba(123, 47, 190, 0.5), 0 0 80px rgba(45, 91, 255, 0.2);
  }

  /* ═══════════════════════════════════════
     FOCUS / INPUTS
  ═══════════════════════════════════════ */
  input:focus {
    caret-color: var(--nebula-purple);
  }

  ::selection {
    background: rgba(123, 47, 190, 0.3);
    color: white;
  }

  /* ═══════════════════════════════════════
     TICKER
  ═══════════════════════════════════════ */
  @keyframes ticker {
    0% { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .animate-ticker {
    animation: ticker 30s linear infinite;
  }

  /* ═══════════════════════════════════════
     FLOATING LABEL
  ═══════════════════════════════════════ */
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  .animate-float { animation: float 4s ease-in-out infinite; }

  /* ═══════════════════════════════════════
     PULSE RING (for live indicators)
  ═══════════════════════════════════════ */
  @keyframes pulseRing {
    0% { transform: scale(1); opacity: 0.5; }
    100% { transform: scale(2.5); opacity: 0; }
  }
  .pulse-ring::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px solid currentColor;
    animation: pulseRing 2s ease-out infinite;
  }
`;
