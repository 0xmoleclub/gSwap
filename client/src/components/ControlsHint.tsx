export function ControlsHint() {
  return (
    <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 text-center pointer-events-none opacity-60">
      <p className="font-display text-sm text-gray-500 tracking-widest uppercase text-[10px]">
        <span className="text-polkadot-pink">Left</span> Rotate &bull;{' '}
        <span className="text-polkadot-pink">Right</span> Pan
      </p>
    </div>
  );
}
