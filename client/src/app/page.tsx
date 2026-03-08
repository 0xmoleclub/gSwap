'use client';

import { useState } from 'react';
import { Token } from '@/types/token';
import { useThreeScene } from '@/hooks/useThreeScene';
import { useIndexerData } from '@/hooks/useIndexerData';
import { LoadingOverlay } from '@/components/LoadingOverlay';
import { Header } from '@/components/Header';
import { Navbar } from '@/components/Navbar';
import { HomeView } from '@/components/views/HomeView';
import { Starfield } from '@/components/Starfield';
import { NebulaBg } from '@/components/NebulaBg';
import { TokenTicker } from '@/components/TokenTicker';
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
    <div className="relative w-full h-screen bg-void overflow-hidden font-sans text-white noise-overlay">
      <style>{globalStyles}</style>

      {isLoading && <LoadingOverlay />}

      {!indexerLoading && error && (
        <div className="absolute inset-0 z-20 flex items-center justify-center">
          <div className="glass-panel p-8 rounded-2xl max-w-md text-center space-y-4 animate-scaleIn">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 border border-red-500/15 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="text-red-400 font-display font-bold text-base">Failed to load pool data</p>
            <p className="text-white/40 text-sm font-body">{error.message}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 rounded-xl btn-galaxy text-white font-display font-bold text-sm btn-press"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Galaxy layers */}
      <NebulaBg />
      <Starfield count={250} />

      <div ref={mountRef} className="absolute inset-0 z-2 grid-bg" />

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

      {/* Bottom ticker */}
      <TokenTicker tokens={indexerData?.tokens ?? []} />
    </div>
  );
}
