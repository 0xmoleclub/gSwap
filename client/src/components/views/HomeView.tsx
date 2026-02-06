import { Token, Pool } from '@/types/token';
import { HUD } from '@/components/HUD';
import { DetailsPanel } from '@/components/DetailsPanel';
import { ControlsHint } from '@/components/ControlsHint';
import Link from 'next/link';

interface HomeViewProps {
  selectedNode: Token | null;
  isPanelOpen: boolean;
  pools: Pool[];
  onClosePanel: () => void;
}

export function HomeView({ selectedNode, isPanelOpen, pools, onClosePanel }: HomeViewProps) {
  return (
    <>
      <HUD />
      <DetailsPanel
        isOpen={isPanelOpen}
        selectedNode={selectedNode}
        pools={pools}
        onClose={onClosePanel}
      >
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 gap-3 relative z-10">
          <Link
            href="/swap"
            className="py-4 rounded-2xl bg-polkadot-pink hover:bg-pink-600 text-white font-bold font-display text-sm transition shadow-[0_0_20px_rgba(230,0,122,0.4)] text-center"
          >
            Swap
          </Link>
          <Link
            href="/liquidity"
            className="py-4 rounded-2xl bg-white text-black hover:bg-gray-200 font-bold font-display text-sm transition text-center"
          >
            Pool
          </Link>
        </div>
      </DetailsPanel>
      <ControlsHint />
    </>
  );
}
