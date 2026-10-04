'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import PhotoSlideshow from '@/components/PhotoSlideshow';
import PhotoAlbum from '@/components/PhotoAlbum';
import BehaviorTracker from '@/components/BehaviorTracker';
import Register from '@/components/Register';
import { Lang } from '@/lib/types';

type Tab = 'photos' | 'stars';

interface CurrentUser {
  name: string;
  kidName: string;
}

const TABS_FR = [
  { id: 'photos' as Tab, label: 'Photos', emoji: '📸', short: 'Photos' },
  { id: 'stars' as Tab,  label: 'Étoiles',  emoji: '⭐', short: 'Étoiles'  },
];
const TABS_EN = [
  { id: 'photos' as Tab, label: 'Photos', emoji: '📸', short: 'Photos' },
  { id: 'stars' as Tab,  label: 'Stars',   emoji: '⭐', short: 'Stars'   },
];

function PartyApp() {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>('photos');
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
    setActiveTab('photos');
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

  const TABS = lang === 'fr' ? TABS_FR : TABS_EN;

  if (!loaded) {
    return (
      <div className="min-h-dvh flex items-center justify-center" style={{ background: '#0a0a1a' }}>
        <div className="text-white text-5xl animate-pulse">🎂</div>
      </div>
    );
  }

  // TV mode — full-screen photo slideshow with star flashes
  if (tvMode) {
    return <PhotoSlideshow />;
  }

  if (!currentUser) {
    return <Register onRegister={handleRegister} lang={lang} onToggleLang={toggleLang} />;
  }

  return (
    <div style={{ background: '#0a0a1a' }} className="min-h-dvh">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-gray-950/95 backdrop-blur border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="text-base font-black text-yellow-400 min-h-[44px] flex items-center">
            🎈 Lando 7!
          </div>
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
        {activeTab === 'photos' && <PhotoAlbum currentUser={currentUser} tvMode={false} lang={lang} />}
        {activeTab === 'stars'  && <BehaviorTracker currentUser={currentUser} lang={lang} />}
      </div>

      {/* Bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/95 backdrop-blur border-t border-white/10"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex justify-around">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center justify-center gap-[2px] flex-1 min-h-[56px] py-1 transition-colors ${
                  isActive ? 'text-yellow-400' : 'text-gray-500'
                }`}
              >
                <span className={`text-3xl leading-none transition-transform ${isActive ? 'scale-125' : ''}`}>
                  {tab.emoji}
                </span>
                <span className="text-[13px] font-bold leading-tight">{tab.short}</span>
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
