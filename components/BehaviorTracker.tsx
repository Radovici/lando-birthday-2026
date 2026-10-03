'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, STAR_REASONS, DEMERIT_REASONS, STAR_REASONS_FR, DEMERIT_REASONS_FR, Lang } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
  lang: Lang;
}

type ConfettiPiece = { id: number; left: number; color: string; delay: number; duration: number };

const COLORS = ['#FFD700', '#FF4444', '#44FF44', '#4488FF', '#FF88FF', '#88FFFF', '#FF8800'];

function Confetti({ pieces }: { pieces: ConfettiPiece[] }) {
  return (
    <>
      {pieces.map(p => (
        <div
          key={p.id}
          className="confetti-piece rounded-sm"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
          } as React.CSSProperties}
        />
      ))}
    </>
  );
}

export default function BehaviorTracker({ currentUser, lang }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [mode, setMode] = useState<'star' | 'demerit'>('star');
  const [selectedReason, setSelectedReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: 'star' | 'demerit'; name: string } | null>(null);
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);

  const fetchPlayers = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_players')
      .select('*')
      .order('stars', { ascending: false });
    if (data) setPlayers(data);
  }, []);

  useEffect(() => {
    fetchPlayers();
    const channel = supabase
      .channel('behavior-tracker')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_players' }, fetchPlayers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPlayers]);

  const canGiveTo = (player: Player) => {
    if (!currentUser) return true;
    return player.name.toLowerCase() !== currentUser.kidName.toLowerCase();
  };

  const spawnConfetti = () => {
    const pieces: ConfettiPiece[] = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 1.5 + Math.random() * 1,
    }));
    setConfetti(pieces);
    setTimeout(() => setConfetti([]), 3000);
  };

  const submitEvent = async () => {
    if (!selectedPlayer || !selectedReason || !currentUser) return;
    if (!canGiveTo(selectedPlayer)) {
      alert(lang === 'fr'
        ? "Vous ne pouvez pas donner des étoiles à votre propre enfant! 😄"
        : "You can't give stars/demerits to your own kid! 😄");
      return;
    }

    setLoading(true);
    try {
      // Store reason in English so it's consistent in DB
      const reasons = mode === 'star' ? STAR_REASONS : DEMERIT_REASONS;
      const reasonsFR = mode === 'star' ? STAR_REASONS_FR : DEMERIT_REASONS_FR;
      const reasonIndex = (lang === 'fr' ? reasonsFR : reasons).indexOf(selectedReason);
      const dbReason = reasonIndex >= 0 ? reasons[reasonIndex] : selectedReason;

      await supabase.from('lando_party_events').insert({
        player_id: selectedPlayer.id,
        given_by: currentUser.name,
        type: mode,
        reason: dbReason,
      });

      if (mode === 'star') {
        await supabase.from('lando_party_players').update({
          stars: selectedPlayer.stars + 1,
        }).eq('id', selectedPlayer.id);
        spawnConfetti();
      } else {
        await supabase.from('lando_party_players').update({
          demerits: selectedPlayer.demerits + 1,
        }).eq('id', selectedPlayer.id);
      }

      setFlash({ type: mode, name: selectedPlayer.name });
      setTimeout(() => setFlash(null), 2500);
      setSelectedPlayer(null);
      setSelectedReason('');
      fetchPlayers();
    } finally {
      setLoading(false);
    }
  };

  const reasons = lang === 'fr'
    ? (mode === 'star' ? STAR_REASONS_FR : DEMERIT_REASONS_FR)
    : (mode === 'star' ? STAR_REASONS : DEMERIT_REASONS);

  return (
    <div className="p-4 pb-24 relative">
      <Confetti pieces={confetti} />

      {/* Flash */}
      {flash && (
        <div className={`fixed top-16 left-1/2 -translate-x-1/2 z-50 text-black font-black text-2xl px-8 py-4 rounded-full shadow-2xl animate-bounce ${
          flash.type === 'star' ? 'bg-yellow-400' : 'bg-red-400'
        }`}>
          {flash.type === 'star'
            ? (lang === 'fr' ? `⭐ ÉTOILE pour ${flash.name}!` : `⭐ STAR for ${flash.name}!`)
            : (lang === 'fr' ? `😈 Point négatif pour ${flash.name}!` : `😈 Demerit for ${flash.name}!`)}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        {lang === 'fr' ? 'Tournoi de Coopération' : 'Cooperation Tournament'}
      </h2>
      <p className="text-center text-gray-400 mb-6">
        {lang === 'fr'
          ? "Donnez des étoiles ou des points négatifs à n'importe quel enfant sauf le vôtre!"
          : 'Give stars or demerits to any kid except your own!'}
      </p>

      {!currentUser && (
        <div className="text-center text-yellow-400 text-xl mb-4 p-4 bg-yellow-400/10 rounded-xl">
          {lang === 'fr'
            ? 'Veuillez vous inscrire pour donner des étoiles/points négatifs! 👆'
            : 'Please register first to give stars/demerits! 👆'}
        </div>
      )}

      {/* Mode toggle */}
      <div className="flex gap-3 mb-6 max-w-md mx-auto">
        <button
          onClick={() => { setMode('star'); setSelectedReason(''); }}
          className={`flex-1 py-4 rounded-xl font-black text-xl transition-all ${
            mode === 'star'
              ? 'bg-yellow-400 text-black scale-105 shadow-[0_0_20px_rgba(255,215,0,0.5)]'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {lang === 'fr' ? '⭐ ÉTOILE' : '⭐ STAR'}
        </button>
        <button
          onClick={() => { setMode('demerit'); setSelectedReason(''); }}
          className={`flex-1 py-4 rounded-xl font-black text-xl transition-all ${
            mode === 'demerit'
              ? 'bg-red-500 text-white scale-105 shadow-[0_0_20px_rgba(255,68,68,0.5)]'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          {lang === 'fr' ? '😈 NÉGATIF' : '😈 DEMERIT'}
        </button>
      </div>

      {/* Player selection */}
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-300 mb-3">
          {lang === 'fr' ? 'Choisir un enfant:' : 'Pick a kid:'}
        </h3>
        {players.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            {lang === 'fr' ? 'Aucun enfant inscrit...' : 'No kids registered yet...'}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {players.map((player) => {
              const canGive = canGiveTo(player);
              const isSelected = selectedPlayer?.id === player.id;
              return (
                <button
                  key={player.id}
                  onClick={() => canGive && setSelectedPlayer(isSelected ? null : player)}
                  disabled={!canGive}
                  className={`p-4 rounded-xl text-left transition-all ${
                    !canGive
                      ? 'opacity-40 cursor-not-allowed bg-gray-800 border border-gray-700'
                      : isSelected
                      ? mode === 'star'
                        ? 'bg-yellow-400/30 border-2 border-yellow-400 scale-105'
                        : 'bg-red-500/30 border-2 border-red-400 scale-105'
                      : 'bg-gray-800 border border-gray-600 hover:border-gray-400 hover:bg-gray-700'
                  }`}
                >
                  <div className="font-black text-lg text-white">{player.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-yellow-400 text-sm">⭐ {player.stars}</span>
                    {player.demerits > 0 && <span className="text-red-400 text-sm">😈 {player.demerits}</span>}
                  </div>
                  {!canGive && (
                    <div className="text-xs text-gray-500 mt-1">
                      {lang === 'fr' ? 'Votre enfant' : 'Your kid'}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Reason selection */}
      {selectedPlayer && (
        <div className="mb-6">
          <h3 className="text-xl font-bold text-gray-300 mb-3">
            {mode === 'star'
              ? (lang === 'fr' ? '⭐ Pourquoi une étoile?' : '⭐ Why a star?')
              : (lang === 'fr' ? "😈 Qu'est-ce qui s'est passé?" : '😈 What happened?')}
          </h3>
          <div className="grid grid-cols-1 gap-2">
            {reasons.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`py-4 px-5 rounded-xl text-left font-semibold text-lg transition-all ${
                  selectedReason === reason
                    ? mode === 'star'
                      ? 'bg-yellow-400 text-black'
                      : 'bg-red-500 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600'
                }`}
              >
                {mode === 'star' ? '⭐' : '😈'} {reason}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Submit button */}
      {selectedPlayer && selectedReason && currentUser && (
        <div className="fixed bottom-20 left-0 right-0 p-4 bg-gray-900/95">
          <button
            onClick={submitEvent}
            disabled={loading}
            className={`w-full py-5 rounded-2xl font-black text-2xl uppercase tracking-wide transition-all ${
              mode === 'star'
                ? 'bg-yellow-400 text-black hover:bg-yellow-300 shadow-[0_0_30px_rgba(255,215,0,0.6)]'
                : 'bg-red-500 text-white hover:bg-red-400 shadow-[0_0_30px_rgba(255,68,68,0.6)]'
            } ${loading ? 'opacity-50' : ''}`}
          >
            {loading
              ? (lang === 'fr' ? 'Envoi...' : 'Submitting...')
              : mode === 'star'
              ? (lang === 'fr' ? `⭐ Étoile pour ${selectedPlayer.name}!` : `⭐ Give Star to ${selectedPlayer.name}!`)
              : (lang === 'fr' ? `😈 Point négatif pour ${selectedPlayer.name}!` : `😈 Demerit for ${selectedPlayer.name}!`)}
          </button>
        </div>
      )}

      {/* Leaderboard */}
      <div>
        <h3 className="text-2xl font-black text-center text-white mb-4 mt-6">
          {lang === 'fr' ? '🏆 Classement' : '🏆 Standings'}
        </h3>
        {players.map((player, index) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 p-3 rounded-xl mb-2 ${
              index === 0 ? 'bg-yellow-500/20 border border-yellow-500/40' : 'bg-white/5'
            }`}
          >
            <span className="text-2xl w-8">{['🥇', '🥈', '🥉'][index] || `#${index + 1}`}</span>
            <div className="flex-1">
              <div className="font-bold text-white">{player.name}</div>
            </div>
            <div className="flex gap-3">
              <span className="text-yellow-400 font-bold">⭐ {player.stars}</span>
              {player.demerits > 0 && <span className="text-red-400 font-bold">😈 {player.demerits}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
