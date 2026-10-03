'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MainHub from '@/components/MainHub';
import FibbageGame from '@/components/FibbageGame';
import BehaviorTracker from '@/components/BehaviorTracker';
import OlympicsScoreboard from '@/components/OlympicsScoreboard';
import PhotoAlbum from '@/components/PhotoAlbum';
import LandooshChat from '@/components/LandooshChat';
import Register from '@/components/Register';

type Tab = 'hub' | 'fibbage' | 'behavior' | 'olympics' | 'photos' | 'chat';

interface CurrentUser {
  name: string;
  kidName: string;
}

const TABS: { id: Tab; label: string; emoji: string; short: string }[] = [
  { id: 'hub', label: 'Party Hub', emoji: '🏠', short: 'Hub' },
  { id: 'fibbage', label: 'Fibbage', emoji: '🎭', short: 'Game' },
  { id: 'behavior', label: 'Stars', emoji: '⭐', short: 'Stars' },
  { id: 'olympics', label: 'Olympics', emoji: '🏆', short: 'Scores' },
  { id: 'photos', label: 'Photos', emoji: '📸', short: 'Pics' },
  { id: 'chat', label: 'Landoosh', emoji: '🤖', short: 'AI' },
];

// YouTube kids party music playlist
const MUSIC_PLAYLIST_ID = 'PLDMEDFTxSVuEqJV6Qu7BxGcW-V8n2SXZR';

function MusicPlayer({ tvMode }: { tvMode: boolean }) {
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const musicSrc = `https://www.youtube.com/embed/videoseries?list=${MUSIC_PLAYLIST_ID}&autoplay=1&mute=${muted ? 1 : 0}&loop=1&controls=0&disablekb=1&fs=0&modestbranding=1&playsinline=1`;

  return (
    <div className={`fixed ${tvMode ? 'top-4 right-4' : 'bottom-[72px] left-0 right-0'} z-30`}>
      {tvMode ? (
        // TV: floating music widget top-right
        <div className="bg-black/80 border border-white/20 rounded-xl p-3 backdrop-blur flex items-center gap-3 min-w-[220px]">
          <div className="text-2xl">🎵</div>
          <div className="flex-1">
            <div className="text-white text-sm font-bold">Party Music</div>
            <div className="text-gray-400 text-xs">Kids Party Hits</div>
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className="text-white text-xl hover:scale-110 transition-transform"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="hidden">
            <iframe
              ref={iframeRef}
              src={musicSrc}
              allow="autoplay"
              width="1" height="1"
            />
          </div>
        </div>
      ) : (
        // Phone: bottom music bar
        <div className="music-bar border-t border-white/10 px-4 py-2 flex items-center gap-3">
          <div className="text-xl">🎵</div>
          <div className="flex-1">
            <div className="text-white text-xs font-bold">Party Music</div>
            <div className="text-gray-500 text-xs">Tap 🔊 to unmute</div>
          </div>
          <button
            onClick={() => setMuted(!muted)}
            className="text-white text-xl hover:scale-110 transition-transform px-2"
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          <div className="hidden">
            <iframe
              ref={iframeRef}
              src={musicSrc}
              allow="autoplay"
              width="1" height="1"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PartyApp() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('hub');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const tvMode = searchParams.get('tv') === '1';

  useEffect(() => {
    const stored = localStorage.getItem('lando-party-user');
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        // invalid storage
      }
    }
  }, []);

  const handleRegister = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('lando-party-user', JSON.stringify(user));
    setShowRegister(false);
  };

  if (showRegister) {
    return <Register onRegister={handleRegister} />;
  }

  return (
    <div className={`min-h-screen ${tvMode ? 'tv-mode' : ''}`} style={{ background: '#0a0a1a' }}>
      {/* Music Player */}
      <MusicPlayer tvMode={tvMode} />

      {/* TV mode: permanent header */}
      {tvMode ? (
        <div className="pb-4">
          <MainHub tvMode={true} />
        </div>
      ) : (
        <>
          {/* Phone: top bar */}
          <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h1 className="text-lg font-black text-yellow-400 leading-tight">🎈 LANDO'S 7TH!</h1>
              </div>
              <div className="flex items-center gap-2">
                {currentUser ? (
                  <button
                    onClick={() => setShowRegister(true)}
                    className="text-sm text-gray-400 border border-gray-600 rounded-lg px-3 py-1 hover:border-gray-400"
                  >
                    {currentUser.name} 👤
                  </button>
                ) : (
                  <button
                    onClick={() => setShowRegister(true)}
                    className="text-sm bg-yellow-400 text-black font-bold rounded-lg px-4 py-2"
                  >
                    Join Party! 🎉
                  </button>
                )}
              </div>
            </div>

            {/* Tab navigation */}
            <div className="flex overflow-x-auto pb-1 px-2 gap-1 scrollbar-hide">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab-btn flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl font-bold text-xs transition-all ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/50 active'
                      : 'text-gray-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <span className="text-lg">{tab.emoji}</span>
                  <span>{tab.short}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="pb-32">
            {activeTab === 'hub' && <MainHub tvMode={false} />}
            {activeTab === 'fibbage' && <FibbageGame currentUser={currentUser} />}
            {activeTab === 'behavior' && <BehaviorTracker currentUser={currentUser} />}
            {activeTab === 'olympics' && <OlympicsScoreboard currentUser={currentUser} />}
            {activeTab === 'photos' && <PhotoAlbum currentUser={currentUser} tvMode={false} />}
            {activeTab === 'chat' && <LandooshChat currentUser={currentUser} />}
          </div>

          {/* Bottom nav for quick access */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-white/10">
            <div className="flex justify-around py-2 px-2">
              {TABS.slice(0, 6).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl flex-1 transition-all ${
                    activeTab === tab.id
                      ? 'text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className={`text-xl ${activeTab === tab.id ? 'scale-125' : ''} transition-transform`}>
                    {tab.emoji}
                  </span>
                  <span className="text-xs font-bold">{tab.short}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-white text-4xl animate-pulse">🎂 Loading...</div>
      </div>
    }>
      <PartyApp />
    </Suspense>
  );
}
