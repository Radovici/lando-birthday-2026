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

const TABS_FR: { id: Tab; label: string; emoji: string; short: string }[] = [
  { id: 'hub', label: 'Accueil', emoji: '🏠', short: 'Accueil' },
  { id: 'fibbage', label: 'Fibbage', emoji: '🎭', short: 'Fibbage' },
  { id: 'quiplash', label: 'Quiplash', emoji: '💬', short: 'Quiz' },
  { id: 'behavior', label: 'Étoiles', emoji: '⭐', short: 'Étoiles' },
  { id: 'olympics', label: 'JO', emoji: '🏆', short: 'JO' },
  { id: 'photos', label: 'Photos', emoji: '📸', short: 'Photos' },
  { id: 'chat', label: 'Landoosh', emoji: '🤖', short: 'IA' },
];

const TABS_EN: { id: Tab; label: string; emoji: string; short: string }[] = [
  { id: 'hub', label: 'Party Hub', emoji: '🏠', short: 'Hub' },
  { id: 'fibbage', label: 'Fibbage', emoji: '🎭', short: 'Game' },
  { id: 'quiplash', label: 'Quiplash', emoji: '💬', short: 'Quiz' },
  { id: 'behavior', label: 'Stars', emoji: '⭐', short: 'Stars' },
  { id: 'olympics', label: 'Olympics', emoji: '🏆', short: 'Scores' },
  { id: 'photos', label: 'Photos', emoji: '📸', short: 'Pics' },
  { id: 'chat', label: 'Landoosh', emoji: '🤖', short: 'AI' },
];

function PartyApp() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('hub');
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [lang, setLang] = useState<Lang>('fr');
  const tvMode = searchParams.get('tv') === '1';

  useEffect(() => {
    // Restore user from localStorage
    const stored = localStorage.getItem('lando-party-user');
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { /* ignore */ }
    }
    // Restore lang preference (default FR)
    const storedLang = localStorage.getItem('lando-party-lang') as Lang | null;
    if (storedLang === 'en' || storedLang === 'fr') {
      setLang(storedLang);
    }
  }, []);

  const handleRegister = (user: CurrentUser) => {
    setCurrentUser(user);
    localStorage.setItem('lando-party-user', JSON.stringify(user));
    setShowRegister(false);
  };

  const toggleLang = () => {
    const next: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('lando-party-lang', next);
  };

  const TABS = lang === 'fr' ? TABS_FR : TABS_EN;

  if (showRegister) {
    return <Register onRegister={handleRegister} lang={lang} />;
  }

  return (
    <div className={`min-h-screen ${tvMode ? 'tv-mode' : ''}`} style={{ background: '#0a0a1a' }}>
      {/* TV mode */}
      {tvMode ? (
        <div className="pb-4">
          <MainHub tvMode={true} lang={lang} />
        </div>
      ) : (
        <>
          {/* Phone: top bar */}
          <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <h1 className="text-lg font-black text-yellow-400 leading-tight">🎈 LANDO 7!</h1>
              </div>
              <div className="flex items-center gap-2">
                {/* Language toggle */}
                <button
                  onClick={toggleLang}
                  className="text-sm border border-white/20 rounded-lg px-3 py-1 text-white hover:border-white/40 transition-colors font-bold"
                  title={lang === 'fr' ? 'Switch to English' : 'Passer en français'}
                >
                  {lang === 'fr' ? '🇫🇷 FR' : '🇺🇸 EN'}
                </button>

                {/* Register / user button */}
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
                    {lang === 'fr' ? 'Rejoindre! 🎉' : 'Join Party! 🎉'}
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
                  className={`tab-btn flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs transition-all ${
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
            {activeTab === 'hub' && <MainHub tvMode={false} lang={lang} />}
            {activeTab === 'fibbage' && <FibbageGame currentUser={currentUser} lang={lang} />}
            {activeTab === 'quiplash' && <QuiplashGame currentUser={currentUser} lang={lang} />}
            {activeTab === 'behavior' && <BehaviorTracker currentUser={currentUser} lang={lang} />}
            {activeTab === 'olympics' && <OlympicsScoreboard currentUser={currentUser} lang={lang} />}
            {activeTab === 'photos' && <PhotoAlbum currentUser={currentUser} tvMode={false} lang={lang} />}
            {activeTab === 'chat' && <LandooshChat currentUser={currentUser} lang={lang} />}
          </div>

          {/* Bottom nav */}
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-white/10">
            <div className="flex justify-around py-2 px-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex flex-col items-center gap-1 p-1 rounded-xl flex-1 transition-all ${
                    activeTab === tab.id
                      ? 'text-yellow-400'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  <span className={`text-lg ${activeTab === tab.id ? 'scale-125' : ''} transition-transform`}>
                    {tab.emoji}
                  </span>
                  <span className="text-xs font-bold leading-tight">{tab.short}</span>
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
        <div className="text-white text-4xl animate-pulse">🎂 Chargement...</div>
      </div>
    }>
      <PartyApp />
    </Suspense>
  );
}
