export function ControlsHint() {
  return (
    <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 text-center pointer-events-none animate-fadeIn stagger-5">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 rounded bg-nebula-purple/8 border border-nebula-purple/12 text-[9px] font-data text-white/30">LMB</kbd>
          <span className="text-[9px] font-data text-white/20 tracking-wider">Rotate</span>
        </div>
        <div className="w-[1px] h-3 bg-nebula-purple/15"></div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 rounded bg-nebula-purple/8 border border-nebula-purple/12 text-[9px] font-data text-white/30">RMB</kbd>
          <span className="text-[9px] font-data text-white/20 tracking-wider">Pan</span>
        </div>
        <div className="w-[1px] h-3 bg-nebula-purple/15"></div>
        <div className="flex items-center gap-2">
          <kbd className="px-2 py-0.5 rounded bg-nebula-purple/8 border border-nebula-purple/12 text-[9px] font-data text-white/30">Scroll</kbd>
          <span className="text-[9px] font-data text-white/20 tracking-wider">Zoom</span>
        </div>
      </div>
    </div>
  );
}
