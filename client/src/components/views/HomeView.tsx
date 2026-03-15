import { Token, Pool, IndexerStats } from '@/types/token';
import { HUD } from '@/components/HUD';
import { DetailsPanel } from '@/components/DetailsPanel';
import { ControlsHint } from '@/components/ControlsHint';
import Link from 'next/link';

interface HomeViewProps {
  selectedNode: Token | null;
  isPanelOpen: boolean;
  pools: Pool[];
  stats?: IndexerStats;
  onClosePanel: () => void;
}

export function HomeView({ selectedNode, isPanelOpen, pools, stats, onClosePanel }: HomeViewProps) {
  return (
    <>
      <HUD stats={stats} />
      <DetailsPanel
        isOpen={isPanelOpen}
        selectedNode={selectedNode}
        pools={pools}
        onClose={onClosePanel}
      >
        <div className="mt-6 pt-6 border-t border-nebula-purple/10 grid grid-cols-2 gap-3 relative z-10 animate-fadeInUp stagger-4">
          <Link
            href="/swap"
            className="py-3.5 rounded-xl btn-galaxy text-white font-display font-bold text-sm text-center btn-press"
          >
            Swap
          </Link>
          <Link
            href="/liquidity"
            className="py-3.5 rounded-xl bg-white/[0.03] border border-nebula-purple/15 hover:border-nebula-blue/30 text-white font-display font-bold text-sm transition-all duration-300 text-center hover:bg-white/[0.05] btn-press"
          >
            Pool
          </Link>
        </div>
      </DetailsPanel>
      <ControlsHint />
    </>
  );
}
