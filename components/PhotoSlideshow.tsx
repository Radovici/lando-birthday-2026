'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Player } from '@/lib/types';

interface Photo {
  url: string;
  uploadedAt: number;
  name: string;
}

interface FlashEvent {
  key: string;
  playerName: string;
  type: 'star' | 'demerit';
  reason: string;
  givenBy: string;
}

const KB_ORIGINS = ['top left', 'top right', 'bottom left', 'bottom right', 'center'];

export default function PhotoSlideshow() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [prevIdx, setPrevIdx] = useState<number | null>(null);
  const [crossfading, setCrossfading] = useState(false);
  const [flashEvent, setFlashEvent] = useState<FlashEvent | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const advanceRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch('/party/api/photos');
      if (res.ok) {
        const data = await res.json();
        setPhotos(prev => {
          const next: Photo[] = data.photos || [];
          if (JSON.stringify(prev.map((p: Photo) => p.url)) !== JSON.stringify(next.map((p: Photo) => p.url))) return next;
          return prev;
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchPhotos();
    const iv = setInterval(fetchPhotos, 12000);
    return () => clearInterval(iv);
  }, [fetchPhotos]);

  // Auto-advance every 9s
  useEffect(() => {
    if (advanceRef.current) clearInterval(advanceRef.current);
    advanceRef.current = setInterval(() => {
      setPhotos(prev => {
        if (prev.length < 2) return prev;
        setCurrentIdx(ci => {
          setPrevIdx(ci);
          setCrossfading(true);
          setTimeout(() => setCrossfading(false), 1500);
          return (ci + 1) % prev.length;
        });
        return prev;
      });
    }, 9000);
    return () => { if (advanceRef.current) clearInterval(advanceRef.current); };
  }, []);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_players')
      .select('*')
      .order('stars', { ascending: false });
    if (data) setPlayers(data);
  }, []);

  useEffect(() => {
    fetchPlayers();
    const ch = supabase
      .channel('tv-players')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_players' }, fetchPlayers)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchPlayers]);

  useEffect(() => {
    const ch = supabase
      .channel('tv-events')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'lando_party_events' },
        async (payload) => {
          const { data: player } = await supabase
            .from('lando_party_players')
            .select('name')
            .eq('id', payload.new.player_id)
            .single();
          if (player) {
            setFlashEvent({
              key: `${payload.new.id}-${Date.now()}`,
              playerName: player.name,
              type: payload.new.type as 'star' | 'demerit',
              reason: payload.new.reason,
              givenBy: payload.new.given_by,
            });
            setTimeout(() => setFlashEvent(null), 5500);
          }
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const current = photos[currentIdx];
  const prev = prevIdx !== null && crossfading ? photos[prevIdx] : null;
  const kbOrigin = KB_ORIGINS[currentIdx % KB_ORIGINS.length];

  return (
    <div className="fixed inset-0 bg-black overflow-hidden select-none" style={{ fontFamily: 'system-ui,sans-serif' }}>
      {/* Previous photo fading out */}
      {prev && (
        <div key={`prev-${prevIdx}`} className="absolute inset-0" style={{ animation: 'tvFadeOut 1.5s ease-in-out forwards', zIndex: 1 }}>
          <Image src={prev.url} alt="party photo" fill style={{ objectFit: 'contain' }} />
        </div>
      )}

      {/* Current photo with Ken Burns */}
      {current ? (
        <div key={`photo-${currentIdx}-${current.url}`} className="absolute inset-0" style={{ animation: crossfading ? 'tvFadeIn 1.5s ease-in-out forwards' : undefined, zIndex: 2 }}>
          <div className="absolute inset-0" style={{ transformOrigin: kbOrigin, animation: 'kenBurns 10s ease-in-out forwards' }}>
            <Image src={current.url} alt="party photo" fill style={{ objectFit: 'contain' }} priority />
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }}>
          <div className="text-center px-8">
            <div className="text-9xl mb-6" style={{ animation: 'float 3s ease-in-out infinite' }}>🎈</div>
            <div className="font-black text-5xl mb-4 rainbow-text">Lando&apos;s 7th Birthday!</div>
            <div className="text-gray-300 text-2xl">Upload photos at</div>
            <div className="text-yellow-400 font-bold text-3xl mt-2">lando.longovici.com/party</div>
          </div>
        </div>
      )}

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-40 pointer-events-none" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.82), transparent)', zIndex: 10 }} />
      <div className="absolute inset-x-0 bottom-0 h-52 pointer-events-none" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.88), transparent)', zIndex: 10 }} />

      {/* Top bar */}
      <div className="absolute top-0 inset-x-0 flex items-start justify-between p-6" style={{ zIndex: 11 }}>
        <div>
          <div className="font-black text-white" style={{ fontSize: 38, textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>
            🎂 Lando&apos;s 7th Birthday!
          </div>
          <div className="text-gray-300 text-xl mt-1">October 4, 2026</div>
        </div>
        <div className="text-right">
          <div className="text-yellow-400 font-bold text-xl">📸 Add your photos!</div>
          <div className="text-gray-300 text-base">lando.longovici.com/party</div>
          <div className="text-pink-400 text-sm mt-1">🎁 We&apos;ll make everyone a photo album!</div>
        </div>
      </div>

      {/* Dot indicators */}
      {photos.length > 1 && (
        <div className="absolute flex gap-2 items-center" style={{ top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 11 }}>
          {photos.slice(0, 16).map((_, i) => (
            <div key={i} style={{
              width: i === currentIdx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === currentIdx ? '#FFD700' : 'rgba(255,255,255,0.35)',
              transition: 'all 0.5s',
            }} />
          ))}
          {photos.length > 16 && <span className="text-white/40 text-sm">+{photos.length - 16}</span>}
        </div>
      )}

      {/* Bottom leaderboard */}
      {players.length > 0 && (
        <div className="absolute bottom-0 inset-x-0 p-5 pb-8 flex justify-center" style={{ zIndex: 11 }}>
          <div className="flex gap-3 flex-wrap justify-center max-w-screen-xl">
            {players.slice(0, 8).map((p, i) => (
              <div key={p.id} className="flex items-center gap-2 px-5 py-2 rounded-2xl"
                style={{
                  background: 'rgba(0,0,0,0.65)',
                  backdropFilter: 'blur(12px)',
                  border: i === 0 ? '2px solid #FFD700' : '1px solid rgba(255,255,255,0.15)',
                }}>
                <span style={{ fontSize: 24 }}>{i === 0 ? '🏆' : i === 1 ? '🥈' : i === 2 ? '🥉' : '⭐'}</span>
                <span className="text-white font-bold" style={{ fontSize: 22 }}>{p.name}</span>
                <span className="text-yellow-400 font-black" style={{ fontSize: 26 }}>{p.stars}</span>
                {p.demerits > 0 && <span className="text-red-400 font-bold" style={{ fontSize: 18 }}>-{p.demerits}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Flash overlay */}
      {flashEvent && (
        <div key={flashEvent.key} className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 50 }}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }} />
          <div className="relative text-center rounded-[2.5rem] shadow-2xl"
            style={{
              padding: '60px 80px',
              maxWidth: 700,
              background: flashEvent.type === 'star'
                ? 'linear-gradient(135deg, rgba(255,215,0,0.18), rgba(255,136,0,0.25))'
                : 'linear-gradient(135deg, rgba(255,68,68,0.18), rgba(170,0,0,0.25))',
              border: `3px solid ${flashEvent.type === 'star' ? '#FFD700' : '#FF4444'}`,
              boxShadow: `0 0 80px ${flashEvent.type === 'star' ? 'rgba(255,215,0,0.4)' : 'rgba(255,68,68,0.4)'}`,
              animation: 'flashScaleIn 0.6s cubic-bezier(0.34,1.56,0.64,1) forwards',
            }}>
            <div style={{ fontSize: 96, lineHeight: 1, marginBottom: 20 }}>
              {flashEvent.type === 'star' ? '⭐' : '💀'}
            </div>
            <div className="font-black" style={{
              fontSize: 72, lineHeight: 1.1, marginBottom: 14,
              color: flashEvent.type === 'star' ? '#FFD700' : '#FF4444',
              textShadow: `0 0 40px ${flashEvent.type === 'star' ? '#FFD700' : '#FF4444'}`,
            }}>
              {flashEvent.playerName}
            </div>
            <div className="text-white font-bold" style={{ fontSize: 38, marginBottom: 10 }}>
              {flashEvent.type === 'star' ? 'gets a ⭐ STAR!' : 'gets a demerit 😬'}
            </div>
            <div className="text-gray-200" style={{ fontSize: 28, marginBottom: 6 }}>{flashEvent.reason}</div>
            <div className="text-gray-400" style={{ fontSize: 22 }}>from {flashEvent.givenBy}</div>
          </div>
        </div>
      )}
    </div>
  );
}
