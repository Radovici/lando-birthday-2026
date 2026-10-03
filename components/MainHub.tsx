'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Player, OlympicsScore, PartyEvent, TEAMS, OLYMPICS_EVENTS, OLYMPICS_EVENTS_FR, TEAM_NAMES, Lang } from '@/lib/types';

interface Props {
  tvMode: boolean;
  lang: Lang;
}

interface TeamTotal {
  team: string;
  total: number;
  byEvent: Record<string, number>;
}

const MEDAL_EMOJIS = ['🥇', '🥈', '🥉', '🎖️', '🏅', '⭐', '✨'];
const TEAM_COLORS: Record<string, string> = {
  'Team Red': '#FF4444',
  'Team Blue': '#4488FF',
};
const TEAM_BG: Record<string, string> = {
  'Team Red': 'from-red-900/60 to-red-700/40',
  'Team Blue': 'from-blue-900/60 to-blue-700/40',
};

export default function MainHub({ tvMode, lang }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<OlympicsScore[]>([]);
  const [recentEvents, setRecentEvents] = useState<(PartyEvent & { player?: Player })[]>([]);
  const [flash, setFlash] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const [playersRes, scoresRes, eventsRes] = await Promise.all([
      supabase.from('lando_party_players').select('*').order('stars', { ascending: false }),
      supabase.from('lando_party_scores').select('*').order('created_at', { ascending: false }),
      supabase.from('lando_party_events').select('*, lando_party_players(*)').order('created_at', { ascending: false }).limit(6),
    ]);

    if (playersRes.data) setPlayers(playersRes.data);
    if (scoresRes.data) setScores(scoresRes.data);
    if (eventsRes.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setRecentEvents(eventsRes.data.map((e: any) => ({
        ...e as PartyEvent,
        player: e.lando_party_players as Player,
      })));
    }
  }, []);

  useEffect(() => {
    fetchData();

    const channel = supabase
      .channel('main-hub-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_players' }, (payload) => {
        fetchData();
        if (payload.eventType === 'UPDATE' && payload.new) {
          const p = payload.new as Player;
          setFlash(`${p.name} ${lang === 'fr' ? 'mis à jour!' : 'updated!'}`);
          setTimeout(() => setFlash(null), 2000);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_events' }, (payload) => {
        fetchData();
        if (payload.eventType === 'INSERT' && payload.new) {
          const e = payload.new as PartyEvent;
          setFlash(e.type === 'star'
            ? (lang === 'fr' ? '⭐ ÉTOILE ATTRIBUÉE!' : '⭐ STAR AWARDED!')
            : (lang === 'fr' ? '😈 Point négatif!' : '😈 Demerit!'));
          setTimeout(() => setFlash(null), 2500);
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_scores' }, () => {
        fetchData();
        setFlash(lang === 'fr' ? '🏆 MISE À JOUR DU SCORE!' : '🏆 SCORE UPDATE!');
        setTimeout(() => setFlash(null), 2000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData, lang]);

  // Calculate team totals
  const teamTotals: TeamTotal[] = TEAMS.map(team => {
    const teamScores = scores.filter(s => s.team === team);
    const byEvent: Record<string, number> = {};
    OLYMPICS_EVENTS.forEach(event => {
      byEvent[event] = teamScores.filter(s => s.event_name === event).reduce((sum, s) => sum + s.points, 0);
    });
    return {
      team,
      total: teamScores.reduce((sum, s) => sum + s.points, 0),
      byEvent,
    };
  });

  const leadingTeam = teamTotals.reduce((a, b) => a.total >= b.total ? a : b);

  const titleSize = tvMode ? 'text-7xl md:text-8xl' : 'text-4xl md:text-5xl';
  const headingSize = tvMode ? 'text-4xl' : 'text-2xl';
  const scoreSize = tvMode ? 'text-6xl' : 'text-4xl';
  const playerNameSize = tvMode ? 'text-3xl' : 'text-xl';
  const starCountSize = tvMode ? 'text-4xl' : 'text-2xl';

  return (
    <div className="min-h-screen p-4 pb-20 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['🎈', '🎉', '⭐', '🎊', '🏆', '🎈', '⭐', '🎉'].map((emoji, i) => (
          <div
            key={i}
            className="absolute text-4xl opacity-10 animate-bounce"
            style={{
              left: `${10 + i * 12}%`,
              top: `${5 + (i % 3) * 30}%`,
              animationDelay: `${i * 0.3}s`,
              animationDuration: `${2 + i * 0.4}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      {/* Flash notification */}
      {flash && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-yellow-400 text-black font-black text-2xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      {/* Birthday Header */}
      <div className="text-center mb-6 relative">
        <h1 className={`${titleSize} font-black birthday-glow leading-tight`}
          style={{ fontFamily: 'Impact, Arial Black, sans-serif', color: '#FFD700' }}>
          {lang === 'fr' ? '🎈 LANDO A 7 ANS! 🎈' : "🎈 LANDO'S 7TH BIRTHDAY! 🎈"}
        </h1>
        <p className={`${tvMode ? 'text-3xl' : 'text-lg'} text-yellow-300 font-bold mt-2`}>
          {lang === 'fr' ? "4 octobre 2026 — C'est la fête! 🎊" : 'October 4, 2026 — Party Time! 🎊'}
        </p>
      </div>

      {/* Olympics Scoreboard - Big TV Display */}
      <div className="mb-6">
        <h2 className={`${headingSize} font-black text-center text-white mb-4 uppercase tracking-widest`}>
          {lang === 'fr' ? '🏆 TABLEAU DES JEUX OLYMPIQUES 🏆' : '🏆 OLYMPICS SCOREBOARD 🏆'}
        </h2>
        <div className="grid grid-cols-2 gap-4 max-w-4xl mx-auto">
          {teamTotals.map((team) => (
            <div
              key={team.team}
              className={`bg-gradient-to-br ${TEAM_BG[team.team]} rounded-2xl p-4 border-4 ${team.team === leadingTeam.team && team.total > 0 ? 'border-yellow-400 shadow-[0_0_30px_rgba(255,215,0,0.5)]' : 'border-white/20'}`}
            >
              <div className="text-center">
                <div className={`${tvMode ? 'text-4xl' : 'text-2xl'} font-black text-white mb-1`}>
                  {team.team === 'Team Red' ? '🔴' : '🔵'} {TEAM_NAMES[team.team][lang]}
                </div>
                {team.team === leadingTeam.team && team.total > 0 && (
                  <div className="text-yellow-400 font-bold text-sm mb-1">
                    {lang === 'fr' ? '👑 EN TÊTE!' : '👑 LEADING!'}
                  </div>
                )}
                <div className={`${scoreSize} font-black`} style={{ color: TEAM_COLORS[team.team] }}>
                  {team.total}
                </div>
                <div className={`${tvMode ? 'text-lg' : 'text-xs'} text-gray-300`}>
                  {lang === 'fr' ? 'POINTS' : 'POINTS'}
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {OLYMPICS_EVENTS.map(event => (
                  <div key={event} className="flex justify-between items-center text-sm">
                    <span className={`${tvMode ? 'text-xl' : 'text-sm'} text-gray-300`}>
                      {lang === 'fr' ? OLYMPICS_EVENTS_FR[event] : event}
                    </span>
                    <span className={`${tvMode ? 'text-2xl' : 'text-base'} font-bold text-white`}>
                      {team.byEvent[event] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Kid Rankings - Leaderboard */}
      <div className="mb-6 max-w-4xl mx-auto">
        <h2 className={`${headingSize} font-black text-center text-white mb-4 uppercase tracking-widest`}>
          {lang === 'fr' ? '⭐ CHAMPIONS DE COOPÉRATION ⭐' : '⭐ COOPERATION CHAMPIONS ⭐'}
        </h2>
        {players.length === 0 ? (
          <div className={`text-center ${tvMode ? 'text-3xl' : 'text-xl'} text-gray-400 py-8`}>
            {lang === 'fr' ? 'En attente des enfants... 👀' : 'Waiting for kids to join... 👀'}
          </div>
        ) : (
          <div className="space-y-2">
            {players.slice(0, tvMode ? 8 : 10).map((player, index) => (
              <div
                key={player.id}
                className={`flex items-center gap-4 rounded-xl p-3 ${
                  index === 0
                    ? 'bg-gradient-to-r from-yellow-600/60 to-yellow-400/40 border-2 border-yellow-400'
                    : index === 1
                    ? 'bg-gradient-to-r from-gray-500/60 to-gray-400/40 border border-gray-300'
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-700/60 to-amber-500/40 border border-amber-400'
                    : 'bg-white/5 border border-white/10'
                }`}
              >
                <div className={`${tvMode ? 'text-4xl' : 'text-2xl'} w-12 text-center`}>
                  {MEDAL_EMOJIS[index] || `#${index + 1}`}
                </div>
                <div className="flex-1">
                  <div className={`${playerNameSize} font-black text-white`}>{player.name}</div>
                  <div className={`${tvMode ? 'text-lg' : 'text-xs'} text-gray-400`}>
                    {lang === 'fr' ? 'Parent:' : 'Parent:'} {player.parent_name}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-center">
                    <div className={`${starCountSize} font-black text-yellow-400`}>
                      {'⭐'.repeat(Math.min(player.stars, tvMode ? 5 : 8))}
                      {player.stars > (tvMode ? 5 : 8) && <span className="text-yellow-400 ml-1">+{player.stars - (tvMode ? 5 : 8)}</span>}
                    </div>
                    <div className={`${tvMode ? 'text-2xl font-bold' : 'text-sm'} text-yellow-300`}>
                      {player.stars} {lang === 'fr' ? 'étoiles' : 'stars'}
                    </div>
                  </div>
                  {player.demerits > 0 && (
                    <div className="text-center">
                      <div className={`${tvMode ? 'text-2xl' : 'text-base'} font-bold text-red-400`}>
                        😈 {player.demerits}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity Feed */}
      <div className="max-w-4xl mx-auto">
        <h2 className={`${tvMode ? 'text-3xl' : 'text-xl'} font-black text-center text-white mb-3 uppercase tracking-widest`}>
          {lang === 'fr' ? '📡 EN DIRECT' : '📡 LIVE FEED'}
        </h2>
        <div className="space-y-2">
          {recentEvents.length === 0 ? (
            <div className={`text-center ${tvMode ? 'text-2xl' : 'text-base'} text-gray-500 py-4`}>
              {lang === 'fr' ? 'La fête commence! 🎉' : 'Party just getting started! 🎉'}
            </div>
          ) : (
            recentEvents.slice(0, 5).map((event) => (
              <div
                key={event.id}
                className={`flex items-center gap-3 rounded-xl p-3 ${
                  event.type === 'star'
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-red-500/10 border border-red-500/30'
                }`}
              >
                <div className={`${tvMode ? 'text-3xl' : 'text-xl'}`}>
                  {event.type === 'star' ? '⭐' : '😈'}
                </div>
                <div className="flex-1">
                  <span className={`${tvMode ? 'text-2xl' : 'text-base'} font-bold text-white`}>
                    {event.player?.name || 'Unknown'}
                  </span>
                  <span className={`${tvMode ? 'text-xl' : 'text-sm'} text-gray-300 ml-2`}>
                    — {event.reason}
                  </span>
                </div>
                <div className={`${tvMode ? 'text-lg' : 'text-xs'} text-gray-500`}>
                  {lang === 'fr' ? 'par' : 'by'} {event.given_by}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
