'use client';

import { useState } from 'react';
import { Token } from '@/types/token';
import { TOKENS } from '@/data/tokens';
import { POOLS } from '@/data/pools';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useIndexerData } from '@/hooks/useIndexerData';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { HomeView } from '@/components/views/HomeView';
import { globalStyles } from '@/styles/global-styles';

export default function HomePage() {
  const [selectedNode, setSelectedNode] = useState<Token | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch live data from indexer; fall back to static data on failure
  const { data: indexerData, loading: indexerLoading } = useIndexerData();

  const tokens = indexerData?.tokens ?? TOKENS;
  const pools = indexerData?.pools ?? POOLS;
  const centralTokenId = indexerData?.centralTokenId ?? 'DOT';

  const handleNodeSelect = (token: Token | null) => {
    setSelectedNode(token);
    setIsPanelOpen(!!token);
  };

  const { mountRef, loading: sceneLoading } = useThreeScene({
    tokens,
    pools,
    centralTokenId,
    onNodeSelect: handleNodeSelect,
  });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      <style>{globalStyles}</style>

      {(sceneLoading || indexerLoading) && <LoadingOverlay />}

      <div ref={mountRef} className="absolute inset-0 z-0 grid-bg" />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <Header />
        <Navbar currentView="home" />

        <div className="flex flex-1 mt-8 relative">
          <HomeView
            selectedNode={selectedNode}
            isPanelOpen={isPanelOpen}
            pools={pools}
            stats={indexerData?.stats}
            onClosePanel={() => setIsPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
