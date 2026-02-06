export const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Unbounded:wght@400;600;700&display=swap');
  
  .font-display { font-family: 'Unbounded', sans-serif; }
  .glass-panel {
    background: rgba(10, 10, 10, 0.75);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.9);
  }
  .neon-text { text-shadow: 0 0 15px rgba(230, 0, 122, 0.8); }
  .grid-bg {
    background-image: radial-gradient(circle at 50% 50%, rgba(230, 0, 122, 0.05) 0%, transparent 70%);
  }
  .custom-scrollbar::-webkit-scrollbar { width: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.05); }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(230, 0, 122, 0.5); border-radius: 2px; }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
  .animate-fadeIn { animation: fadeIn 0.5s ease-out forwards; }
`;
