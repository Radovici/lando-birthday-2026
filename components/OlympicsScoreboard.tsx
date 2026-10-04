'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
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

const FALLBACK_COLORS = [
  { bg: 'bg-gradient-to-br from-green-800/80 to-green-600/60', text: 'text-green-300', border: 'border-green-500', glow: 'shadow-[0_0_30px_rgba(68,255,68,0.4)]' },
  { bg: 'bg-gradient-to-br from-purple-800/80 to-purple-600/60', text: 'text-purple-300', border: 'border-purple-500', glow: 'shadow-[0_0_30px_rgba(168,68,255,0.4)]' },
  { bg: 'bg-gradient-to-br from-yellow-800/80 to-yellow-600/60', text: 'text-yellow-300', border: 'border-yellow-500', glow: 'shadow-[0_0_30px_rgba(255,215,68,0.4)]' },
  { bg: 'bg-gradient-to-br from-pink-800/80 to-pink-600/60', text: 'text-pink-300', border: 'border-pink-500', glow: 'shadow-[0_0_30px_rgba(255,68,136,0.4)]' },
];

function getTeamColors(team: string, idx: number) {
  return TEAM_COLORS[team] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length];
}

function getTeamEmoji(team: string) {
  if (team === 'Team Red') return '🔴';
  if (team === 'Team Blue') return '🔵';
  return '🏅';
}

export default function OlympicsScoreboard({ currentUser, lang }: Props) {
  const [scores, setScores] = useState<OlympicsScore[]>([]);

  // Write-in form
  const [writeEvent, setWriteEvent] = useState('');
  const [writeTeam, setWriteTeam] = useState('');
  const [writePoints, setWritePoints] = useState('1');
  const [writeLoading, setWriteLoading] = useState(false);

  // Quick-add modal (pre-defined events)
  const [adding, setAdding] = useState<{ team: string; event: string } | null>(null);
  const [points, setPoints] = useState(1);
  const [loading, setLoading] = useState(false);

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

  // Merge static defaults with whatever teams/events are in the DB
  const allTeams = Array.from(new Set([...TEAMS, ...scores.map(s => s.team)]));
  const allEvents = Array.from(new Set([...OLYMPICS_EVENTS, ...scores.map(s => s.event_name)]));

  const getTeamEventTotal = (team: string, event: string) =>
    scores.filter(s => s.team === team && s.event_name === event).reduce((sum, s) => sum + s.points, 0);

  const getTeamTotal = (team: string) =>
    scores.filter(s => s.team === team).reduce((sum, s) => sum + s.points, 0);

  const totals = allTeams.map(team => ({ team, total: getTeamTotal(team) }));
  const leader = totals.reduce((a, b) => a.total >= b.total ? a : b);

  // ── Write-in submit ──────────────────────────────────────────
  const submitWriteIn = async () => {
    const eventName = writeEvent.trim();
    const teamName = writeTeam.trim();
    const pts = parseInt(writePoints, 10);
    if (!eventName || !teamName || isNaN(pts) || pts <= 0 || !currentUser) return;

    setWriteLoading(true);
    try {
      const { error } = await supabase.from('lando_party_scores').insert({
        team: teamName,
        event_name: eventName,
        points: pts,
        added_by: currentUser.name,
      });
      if (!error) {
        toast(`⭐ ${teamName} +${pts} pts sur ${eventName}!`);
        setWriteEvent('');
        setWriteTeam('');
        setWritePoints('1');
        fetchScores();
      }
    } finally {
      setWriteLoading(false);
    }
  };

  // ── Quick-add modal submit ───────────────────────────────────
  const addScore = async () => {
    if (!adding || !currentUser) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('lando_party_scores').insert({
        team: adding.team,
        event_name: adding.event,
        points,
        added_by: currentUser.name,
      });
      if (!error) {
        const teamName = TEAM_NAMES[adding.team]?.[lang] ?? adding.team;
        const eventName = lang === 'fr' ? (OLYMPICS_EVENTS_FR[adding.event] ?? adding.event) : adding.event;
        toast(`⭐ ${teamName} +${points} pts sur ${eventName}!`);
        setAdding(null);
        setPoints(1);
        fetchScores();
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Delete a score row ───────────────────────────────────────
  const deleteScore = async (id: string) => {
    await supabase.from('lando_party_scores').delete().eq('id', id);
    fetchScores();
  };

  // CSS grid template: 1 label col + 1 col per team
  const gridCols = `1fr ${allTeams.map(() => '1fr').join(' ')}`;

  return (
    <div className="p-4 pb-24">
      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        {lang === 'fr' ? '🏆 Jeux olympiques' : '🏆 Olympics Scoreboard'}
      </h2>
      <p className="text-center text-gray-400 mb-6">
        {lang === 'fr'
          ? 'Ajoutez des points pour chaque équipe par épreuve'
          : 'Add points for each team per event'}
      </p>

      {/* ── Write-in form ─────────────────────────────────────── */}
      {currentUser ? (
        <div className="mb-6 bg-white/5 rounded-2xl p-4 border border-white/10">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            {lang === 'fr' ? '➕ Nouvelle entrée' : '➕ New Entry'}
          </h3>
          <div className="flex flex-col gap-3">
            {/* Event */}
            <div>
              <label className="text-xs text-gray-400 mb-1 block">
                Événement / Event
              </label>
              <input
                type="text"
                value={writeEvent}
                onChange={e => setWriteEvent(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitWriteIn()}
                placeholder={lang === 'fr' ? 'ex: Course à pied' : 'e.g. Relay Race'}
                list="event-suggestions"
                className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-white/20 focus:border-yellow-400 focus:outline-none"
              />
              <datalist id="event-suggestions">
                {allEvents.map(e => <option key={e} value={e} />)}
              </datalist>
            </div>
            {/* Team + Points on same row */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-400 mb-1 block">
                  Équipe / Team
                </label>
                <input
                  type="text"
                  value={writeTeam}
                  onChange={e => setWriteTeam(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitWriteIn()}
                  placeholder={lang === 'fr' ? 'ex: Équipe Rouge' : 'e.g. Team Red'}
                  list="team-suggestions"
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-white/20 focus:border-yellow-400 focus:outline-none"
                />
                <datalist id="team-suggestions">
                  {allTeams.map(t => <option key={t} value={t} />)}
                </datalist>
              </div>
              <div className="w-24">
                <label className="text-xs text-gray-400 mb-1 block">Points</label>
                <input
                  type="number"
                  value={writePoints}
                  onChange={e => setWritePoints(e.target.value)}
                  min={1}
                  max={100}
                  className="w-full bg-gray-800 text-white rounded-xl px-3 py-3 text-sm border border-white/20 focus:border-yellow-400 focus:outline-none text-center"
                />
              </div>
            </div>
            {/* Submit */}
            <button
              onClick={submitWriteIn}
              disabled={writeLoading || !writeEvent.trim() || !writeTeam.trim()}
              className="w-full py-3 rounded-xl font-black text-black bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-lg"
            >
              {writeLoading ? '...' : (lang === 'fr' ? '✓ Ajouter' : '✓ Add')}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center text-yellow-400 text-lg p-4 bg-yellow-400/10 rounded-xl mb-6">
          {lang === 'fr'
            ? "Inscrivez-vous d'abord pour ajouter des points! 👆"
            : 'Register first to add points! 👆'}
        </div>
      )}

      {/* ── Big team totals ────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {allTeams.map((team, idx) => {
          const colors = getTeamColors(team, idx);
          const total = getTeamTotal(team);
          const isLeading = leader.team === team && total > 0;
          const displayName = TEAM_NAMES[team]?.[lang] ?? team;
          return (
            <div
              key={team}
              className={`${colors.bg} rounded-2xl p-4 border-2 ${colors.border} ${isLeading ? colors.glow : ''}`}
            >
              <div className="text-center">
                <div className="text-2xl font-black text-white leading-tight">
                  {getTeamEmoji(team)} {displayName}
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

      {/* ── Event breakdown table (all events, all teams) ───────── */}
      <div className="mb-6 bg-white/5 rounded-2xl overflow-hidden">
        {/* Header */}
        <div
          className="py-3 bg-white/10 font-black text-gray-300 uppercase text-xs text-center"
          style={{ display: 'grid', gridTemplateColumns: gridCols }}
        >
          <div className="px-2 text-left">{lang === 'fr' ? 'Épreuve' : 'Event'}</div>
          {allTeams.map(t => {
            const name = TEAM_NAMES[t]?.[lang] ?? t;
            return (
              <div key={t} className={t === 'Team Red' ? 'text-red-400' : t === 'Team Blue' ? 'text-blue-400' : 'text-gray-300'}>
                {getTeamEmoji(t)} {name}
              </div>
            );
          })}
        </div>
        {/* Rows */}
        {allEvents.map(event => {
          const displayName = lang === 'fr' ? (OLYMPICS_EVENTS_FR[event] ?? event) : event;
          return (
            <div
              key={event}
              className="items-center py-3 border-t border-white/10 px-2"
              style={{ display: 'grid', gridTemplateColumns: gridCols }}
            >
              <div className="text-sm text-white font-semibold">
                {EVENT_EMOJIS[event] ?? '🏅'} {displayName}
              </div>
              {allTeams.map(team => {
                const sc = getTeamEventTotal(team, event);
                return (
                  <div
                    key={team}
                    className={`text-center text-2xl font-black ${team === 'Team Red' ? 'text-red-300' : team === 'Team Blue' ? 'text-blue-300' : 'text-gray-300'}`}
                  >
                    {sc > 0 ? sc : <span className="text-gray-600 text-base">—</span>}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* ── Score log with delete buttons ───────────────────────── */}
      {currentUser && scores.length > 0 && (
        <div className="mb-8">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3">
            {lang === 'fr' ? '📋 Historique des points' : '📋 Score Log'}
          </h3>
          <div className="space-y-2">
            {scores.map(s => {
              const displayEvent = lang === 'fr' ? (OLYMPICS_EVENTS_FR[s.event_name] ?? s.event_name) : s.event_name;
              const displayTeam = TEAM_NAMES[s.team]?.[lang] ?? s.team;
              return (
                <div key={s.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                  <div className="text-lg">{getTeamEmoji(s.team)}</div>
                  <div className="flex-1 min-w-0">
                    <span className="font-bold text-white text-sm">{displayTeam}</span>
                    <span className="text-gray-500 mx-2 text-sm">·</span>
                    <span className="text-gray-300 text-sm">{displayEvent}</span>
                  </div>
                  <div className="font-black text-yellow-400 text-sm">+{s.points}</div>
                  <button
                    onClick={() => deleteScore(s.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors w-7 h-7 flex items-center justify-center rounded-full hover:bg-red-400/10 text-xl leading-none flex-shrink-0"
                    title={lang === 'fr' ? 'Supprimer' : 'Delete'}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Quick-add buttons for pre-defined events ─────────────── */}
      {currentUser && (
        <div>
          <h3 className="text-xl font-black text-white mb-4 text-center">
            {lang === 'fr' ? '⚡ Ajout rapide' : '⚡ Quick Add'}
          </h3>
          <div className="space-y-3">
            {OLYMPICS_EVENTS.map(event => {
              const displayName = lang === 'fr' ? OLYMPICS_EVENTS_FR[event] : event;
              return (
                <div key={event} className="bg-white/5 rounded-xl p-4">
                  <div className="font-bold text-white mb-3">
                    {EVENT_EMOJIS[event] ?? '🏅'} {displayName}
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

      {/* ── Quick-add modal ──────────────────────────────────────── */}
      {adding && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm border border-white/20">
            <h3 className="text-xl font-black text-white mb-4 text-center">
              {lang === 'fr' ? 'Ajouter des points' : 'Add Points'}
            </h3>
            <div className="text-center mb-4">
              <div className="text-lg text-gray-300">
                {lang === 'fr' ? (OLYMPICS_EVENTS_FR[adding.event] ?? adding.event) : adding.event}
              </div>
              <div className={`text-2xl font-black ${adding.team === 'Team Red' ? 'text-red-400' : 'text-blue-400'}`}>
                {adding.team === 'Team Red' ? '🔴' : '🔵'} {TEAM_NAMES[adding.team][lang]}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4 mb-6">
              <button
                onClick={() => setPoints(Math.max(1, points - 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-black hover:bg-gray-600"
              >
                -
              </button>
              <span className="text-5xl font-black text-white w-16 text-center">{points}</span>
              <button
                onClick={() => setPoints(Math.min(10, points + 1))}
                className="w-12 h-12 rounded-full bg-gray-700 text-white text-2xl font-black hover:bg-gray-600"
              >
                +
              </button>
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
