'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { OlympicsScore, TEAMS, OLYMPICS_EVENTS, OLYMPICS_EVENTS_FR, TEAM_NAMES, Lang } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
  lang: Lang;
}

const EVENT_EMOJIS: Record<string, string> = {
  'Kickball': '🏈',
  'Soccer': '⚽',
  'Water Bucket Race': '🪣',
  'Egg & Spoon Race': '🥚',
  'Sack Race': '🎽',
};

const TEAM_COLORS: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  'Team Red': {
    bg: 'bg-gradient-to-br from-red-800/80 to-red-600/60',
    text: 'text-red-300',
    border: 'border-red-500',
    glow: 'shadow-[0_0_30px_rgba(255,68,68,0.4)]',
  },
  'Team Blue': {
    bg: 'bg-gradient-to-br from-blue-800/80 to-blue-600/60',
    text: 'text-blue-300',
    border: 'border-blue-500',
    glow: 'shadow-[0_0_30px_rgba(68,136,255,0.4)]',
  },
};

export default function OlympicsScoreboard({ currentUser, lang }: Props) {
  const [scores, setScores] = useState<OlympicsScore[]>([]);
  const [adding, setAdding] = useState<{ team: string; event: string } | null>(null);
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_scores')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setScores(data);
  }, []);

  useEffect(() => {
    fetchScores();
    const channel = supabase
      .channel('olympics-scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_scores' }, () => {
        fetchScores();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchScores]);

  const getTeamEventTotal = (team: string, event: string) =>
    scores.filter(s => s.team === team && s.event_name === event).reduce((sum, s) => sum + s.points, 0);

  const getTeamTotal = (team: string) =>
    scores.filter(s => s.team === team).reduce((sum, s) => sum + s.points, 0);

  const addScore = async () => {
    if (!adding || !currentUser) return;
    setLoading(true);
    try {
      await supabase.from('lando_party_scores').insert({
        team: adding.team,
        event_name: adding.event,
        points,
        added_by: currentUser.name,
      });
      const teamName = TEAM_NAMES[adding.team][lang];
      const eventName = lang === 'fr' ? OLYMPICS_EVENTS_FR[adding.event] : adding.event;
      setFlash(`+${points} ${lang === 'fr' ? 'pour' : 'for'} ${teamName} — ${eventName}! 🎉`);
      setTimeout(() => setFlash(null), 2000);
      setAdding(null);
      setPoints(1);
      fetchScores();
    } finally {
      setLoading(false);
    }
  };

  const totals = TEAMS.map(team => ({ team, total: getTeamTotal(team) }));
  const leader = totals.reduce((a, b) => a.total >= b.total ? a : b);

  return (
    <div className="p-4 pb-24">
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-green-400 text-black font-black text-xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        {lang === 'fr' ? '🏆 Jeux olympiques' : '🏆 Olympics Scoreboard'}
      </h2>
      <p className="text-center text-gray-400 mb-6">
        {lang === 'fr'
          ? 'Ajoutez des points pour chaque équipe par épreuve'
          : 'Add points for each team per event'}
      </p>

      {/* Big team totals */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {TEAMS.map(team => {
          const colors = TEAM_COLORS[team];
          const total = getTeamTotal(team);
          const isLeading = leader.team === team && total > 0;
          return (
            <div
              key={team}
              className={`${colors.bg} rounded-2xl p-4 border-2 ${colors.border} ${isLeading ? colors.glow : ''}`}
            >
              <div className="text-center">
                <div className="text-3xl font-black text-white">
                  {team === 'Team Red' ? '🔴' : '🔵'} {TEAM_NAMES[team][lang]}
                </div>
                {isLeading && (
                  <div className="text-yellow-400 font-bold text-sm">
                    {lang === 'fr' ? '👑 EN TÊTE' : '👑 LEADING'}
                  </div>
                )}
                <div className="text-6xl font-black text-white mt-2">{total}</div>
                <div className={`text-sm ${colors.text}`}>
                  {lang === 'fr' ? 'POINTS TOTAL' : 'TOTAL POINTS'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Event breakdown table */}
      <div className="mb-6 bg-white/5 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-3 text-center py-3 bg-white/10 font-black text-gray-300 uppercase text-sm">
          <div>{lang === 'fr' ? 'Épreuve' : 'Event'}</div>
          <div className="text-red-400">{lang === 'fr' ? '🔴 Rouge' : '🔴 Red'}</div>
          <div className="text-blue-400">{lang === 'fr' ? '🔵 Bleu' : '🔵 Blue'}</div>
        </div>
        {OLYMPICS_EVENTS.map(event => {
          const redScore = getTeamEventTotal('Team Red', event);
          const blueScore = getTeamEventTotal('Team Blue', event);
          const redWins = redScore > blueScore;
          const blueWins = blueScore > redScore;
          const displayName = lang === 'fr' ? OLYMPICS_EVENTS_FR[event] : event;
          return (
            <div key={event} className="grid grid-cols-3 items-center py-3 border-t border-white/10 px-2">
              <div className="text-sm text-white font-semibold">
                {EVENT_EMOJIS[event] || '🏅'} {displayName}
              </div>
              <div className={`text-center text-2xl font-black ${redWins ? 'text-yellow-400' : 'text-red-300'}`}>
                {redScore}
              </div>
              <div className={`text-center text-2xl font-black ${blueWins ? 'text-yellow-400' : 'text-blue-300'}`}>
                {blueScore}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add points section */}
      {currentUser && (
        <div>
          <h3 className="text-2xl font-black text-white mb-4 text-center">
            {lang === 'fr' ? 'Ajouter des points' : 'Add Points'}
          </h3>
          <div className="space-y-3">
            {OLYMPICS_EVENTS.map(event => {
              const displayName = lang === 'fr' ? OLYMPICS_EVENTS_FR[event] : event;
              return (
                <div key={event} className="bg-white/5 rounded-xl p-4">
                  <div className="font-bold text-white mb-3">
                    {EVENT_EMOJIS[event] || '🏅'} {displayName}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {TEAMS.map(team => (
                      <button
                        key={team}
                        onClick={() => setAdding({ team, event })}
                        className={`py-3 rounded-xl font-bold text-sm transition-all ${
                          team === 'Team Red'
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-blue-600 hover:bg-blue-500 text-white'
                        }`}
                      >
                        + {team === 'Team Red' ? '🔴' : '🔵'} {TEAM_NAMES[team][lang]}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!currentUser && (
        <div className="text-center text-yellow-400 text-lg p-4 bg-yellow-400/10 rounded-xl">
          {lang === 'fr'
            ? 'Inscrivez-vous d\'abord pour ajouter des points! 👆'
            : 'Register first to add points! 👆'}
        </div>
      )}

      {/* Add points modal */}
      {adding && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-white/20">
            <h3 className="text-xl font-black text-white mb-4 text-center">
              {lang === 'fr' ? 'Ajouter des points' : 'Add Points'}
            </h3>
            <div className="text-center mb-4">
              <div className="text-lg text-gray-300">
                {lang === 'fr' ? OLYMPICS_EVENTS_FR[adding.event] : adding.event}
              </div>
              <div className={`text-2xl font-black ${adding.team === 'Team Red' ? 'text-red-400' : 'text-blue-400'}`}>
                {adding.team === 'Team Red' ? '🔴' : '🔵'} {TEAM_NAMES[adding.team][lang]}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setPoints(Math.max(1, points - 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-black hover:bg-gray-600"
              >-</button>
              <span className="text-5xl font-black text-white w-16 text-center">{points}</span>
              <button
                onClick={() => setPoints(Math.min(10, points + 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-black hover:bg-gray-600"
              >+</button>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setAdding(null)}
                className="flex-1 py-3 rounded-xl bg-gray-700 text-white font-bold"
              >
                {lang === 'fr' ? 'Annuler' : 'Cancel'}
              </button>
              <button
                onClick={addScore}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-black text-white ${
                  adding.team === 'Team Red' ? 'bg-red-600 hover:bg-red-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {loading
                  ? (lang === 'fr' ? 'Ajout...' : 'Adding...')
                  : (lang === 'fr' ? `Ajouter ${points} pts!` : `Add ${points} pts!`)}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
