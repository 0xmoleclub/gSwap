'use client';

import { useState } from 'react';
import { Token } from '@/types/token';
import { TOKENS } from '@/data/tokens';
import { POOLS } from '@/data/pools';
import { useThreeScene } from '@/hooks/useThreeScene';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { HomeView } from '@/components/views/HomeView';
import { globalStyles } from '@/styles/global-styles';

export default function HomePage() {
  const [selectedNode, setSelectedNode] = useState<Token | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  const handleNodeSelect = (token: Token | null) => {
    setSelectedNode(token);
    setIsPanelOpen(!!token);
  };

  const { mountRef, loading } = useThreeScene({
    tokens: TOKENS,
    pools: POOLS,
    onNodeSelect: handleNodeSelect,
  });

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      <style>{globalStyles}</style>

      {loading && <LoadingOverlay />}

      <div ref={mountRef} className="absolute inset-0 z-0 grid-bg" />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <Header />
        <Navbar currentView="home" />

        <div className="flex flex-1 mt-8 relative pointer-events-auto">
          <HomeView
            selectedNode={selectedNode}
            isPanelOpen={isPanelOpen}
            pools={POOLS}
            onClosePanel={() => setIsPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}