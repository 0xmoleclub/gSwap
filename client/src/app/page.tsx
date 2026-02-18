'use client';

import { useState } from 'react';
import { Token } from '@/types/token';
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

  const { data: indexerData, loading: indexerLoading, error } = useIndexerData();

  const handleNodeSelect = (token: Token | null) => {
    setSelectedNode(token);
    setIsPanelOpen(!!token);
  };

  const { mountRef, loading: sceneLoading } = useThreeScene({
    tokens: indexerData?.tokens ?? [],
    pools: indexerData?.pools ?? [],
    centralTokenId: indexerData?.centralTokenId ?? '',
    onNodeSelect: handleNodeSelect,
  });

  const isLoading = indexerLoading || sceneLoading;

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden font-sans text-white">
      <style>{globalStyles}</style>

      {isLoading && <LoadingOverlay />}

      {!indexerLoading && error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md text-center space-y-4">
            <p className="text-red-400 font-bold text-lg">Failed to load pool data</p>
            <p className="text-gray-400 text-sm">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 rounded-xl bg-polkadot-pink hover:bg-pink-600 text-white font-bold text-sm transition"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      <div ref={mountRef} className="absolute inset-0 z-0 grid-bg" />

      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        <Header />
        <Navbar currentView="home" />

        <div className="flex flex-1 mt-8 relative">
          <HomeView
            selectedNode={selectedNode}
            isPanelOpen={isPanelOpen}
            pools={indexerData?.pools ?? []}
            stats={indexerData?.stats}
            onClosePanel={() => setIsPanelOpen(false)}
          />
        </div>
      </div>
    </div>
  );
}
