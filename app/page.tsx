'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import MainHub from '@/components/MainHub';
import FibbageGame from '@/components/FibbageGame';
import BehaviorTracker from '@/components/BehaviorTracker';
import OlympicsScoreboard from '@/components/OlympicsScoreboard';
import PhotoAlbum from '@/components/PhotoAlbum';
import LandooshChat from '@/components/LandooshChat';
import QuiplashGame from '@/components/QuiplashGame';
import Register from '@/components/Register';
import { Lang } from '@/lib/types';

type Tab = 'hub' | 'fibbage' | 'quiplash' | 'behavior' | 'olympics' | 'photos' | 'chat';

interface CurrentUser {
  name: string;
  kidName: string;
}

// 6 game tabs (hub accessible via title tap)
const GAME_TABS_FR: { id: Tab; label: string; emoji: string; short: string }[] = [
  { id: 'fibbage',   label: 'Fibbage',       emoji: '🎭', short: 'Fibbage'    },
  { id: 'quiplash',  label: 'Quiplash',       emoji: '💬', short: 'Quiplash'   },
  { id: 'chat',      label: 'Landoosh',       emoji: '🤖', short: 'Landoosh'   },
  { id: 'behavior',  label: 'Comportement',   emoji: '⭐', short: 'Étoiles'    },
  { id: 'olympics',  label: 'Olympiades',     emoji: '🏅', short: 'Olympiades' },
  { id: 'photos',    label: 'Photos',         emoji: '📸', short: 'Photos'     },
];

const GAME_TABS_EN: { id: Tab; label: string; emoji: string; short: string }[] = [
  { id: 'fibbage',   label: 'Fibbage',    emoji: '🎭', short: 'Fibbage'   },
  { id: 'quiplash',  label: 'Quiplash',   emoji: '💬', short: 'Quiplash'  },
  { id: 'chat',      label: 'Landoosh',   emoji: '🤖', short: 'Landoosh'  },
  { id: 'behavior',  label: 'Behavior',   emoji: '⭐', short: 'Stars'     },
  { id: 'olympics',  label: 'Olympics',   emoji: '🏅', short: 'Olympics'  },
  { id: 'photos',    label: 'Photos',     emoji: '📸', short: 'Photos'    },
];

function PartyApp() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('hub');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [lang, setLang] = useState<Lang>('fr');
  const tvMode = searchParams.get('tv') === '1';

  useEffect(() => {
    const stored = localStorage.getItem('lando-party-user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    const storedLang = localStorage.getItem('lando-party-lang') as Lang | null;
    if (storedLang === 'en' || storedLang === 'fr') setLang(storedLang);
    setLoaded(true);
  }, []);

  const handleRegister = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('lando-party-user', JSON.stringify(user));
    setActiveTab('hub');
  };

  const handleChangeUser = () => {
    setCurrentUser(null);
    localStorage.removeItem('lando-party-user');
  };

  const toggleLang = () => {
    const next: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('lando-party-lang', next);
  };

  const GAME_TABS = lang === 'fr' ? GAME_TABS_FR : GAME_TABS_EN;

  // Loading — wait for localStorage before deciding which screen to show
  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-white text-5xl animate-pulse">🎂</div>
      </div>
    );
  }

  // TV mode — just the big scoreboard
  if (tvMode) {
    return (
      <div style={{ background: '#0a0a1a' }}>
        <MainHub tvMode={true} lang={lang} />
      </div>
    );
  }

  // No user yet → show simplified join landing
  if (!currentUser) {
    return <Register onRegister={handleRegister} lang={lang} onToggleLang={toggleLang} />;
  }

  // Main tabbed app
  return (
    <div style={{ background: '#0a0a1a' }} className="min-h-dvh">
      {/* Slim top bar */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-2">
          {/* Title — tap to go back to live scoreboard */}
          <button
            onClick={() => setActiveTab('hub')}
            className="text-base font-black text-yellow-400 min-h-[44px] flex items-center"
          >
            🎈 Lando 7!
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLang}
              className="text-sm border border-white/20 rounded-lg px-3 font-bold text-white min-h-[44px]"
            >
              {lang === 'fr' ? '🇫🇷 FR' : '🇺🇸 EN'}
            </button>
            <button
              onClick={handleChangeUser}
              className="text-sm text-gray-400 border border-gray-600 rounded-lg px-3 min-h-[44px]"
            >
              {currentUser.name} 👤
            </button>
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="pb-[72px]">
        {activeTab === 'hub'      && <MainHub tvMode={false} lang={lang} />}
        {activeTab === 'fibbage'  && <FibbageGame currentUser={currentUser} lang={lang} />}
        {activeTab === 'quiplash' && <QuiplashGame currentUser={currentUser} lang={lang} />}
        {activeTab === 'chat'     && <LandooshChat currentUser={currentUser} lang={lang} />}
        {activeTab === 'behavior' && <BehaviorTracker currentUser={currentUser} lang={lang} />}
        {activeTab === 'olympics' && <OlympicsScoreboard currentUser={currentUser} lang={lang} />}
        {activeTab === 'photos'   && <PhotoAlbum currentUser={currentUser} tvMode={false} lang={lang} />}
      </div>

      {/* Bottom nav — 6 game tabs, large tap targets */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-around">
          {GAME_TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-[2px] flex-1 min-h-[56px] py-1 transition-colors ${
                  isActive ? 'text-yellow-400' : 'text-gray-500'
                }`}
              >
                <span className={`text-xl leading-none transition-transform ${isActive ? 'scale-125' : ''}`}>
                  {tab.emoji}
                </span>
                <span className="text-[10px] font-bold leading-tight">{tab.short}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-white text-5xl animate-pulse">🎂</div>
      </div>
    }>
      <PartyApp />
    </Suspense>
  );
}
