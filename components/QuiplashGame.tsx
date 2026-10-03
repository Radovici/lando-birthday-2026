'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { QuiplashAnswer, QUIPLASH_PROMPTS, Lang } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
  lang: Lang;
}

interface RemoteGameState {
  phase: string;
  current_question_id: number;
  host_message: string | null;
}

export default function QuiplashGame({ currentUser, lang }: Props) {
  const [remoteState, setRemoteState] = useState<RemoteGameState | null>(null);
  const [answers, setAnswers] = useState<QuiplashAnswer[]>([]);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [scores, setScores] = useState<Record<string, number>>({});

  const phase = (remoteState?.phase ?? 'waiting') as 'waiting' | 'answering' | 'voting' | 'results' | 'finished';
  const currentPromptId = remoteState?.current_question_id ?? 1;
  const currentPrompt = QUIPLASH_PROMPTS.find(p => p.id === currentPromptId);

  // --- Remote game state ---
  const fetchRemoteState = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_game_state')
      .select('*')
      .eq('id', 'quiplash')
      .single();
    if (data) setRemoteState(data);
  }, []);

  useEffect(() => {
    fetchRemoteState();
    const channel = supabase
      .channel('quiplash-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_game_state', filter: 'id=eq.quiplash' }, () => {
        fetchRemoteState();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRemoteState]);

  // --- Answers ---
  const fetchAnswers = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_quiplash')
      .select('*')
      .eq('prompt_id', currentPromptId)
      .order('created_at', { ascending: true });
    if (data) setAnswers(data);
  }, [currentPromptId]);

  useEffect(() => {
    fetchAnswers();
    const channel = supabase
      .channel('quiplash-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_quiplash' }, fetchAnswers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAnswers]);

  useEffect(() => {
    if (currentUser) {
      const alreadySubmitted = answers.some(a => a.player_name === currentUser.name);
      setSubmitted(alreadySubmitted);
      if (!alreadySubmitted) setMyAnswer('');
    } else {
      setSubmitted(false);
      setMyAnswer('');
    }
  }, [answers, currentUser]);

  // --- Host controls ---
  const setPhase = async (newPhase: string, promptId?: number) => {
    const { error } = await supabase.from('lando_party_game_state').upsert({
      id: 'quiplash',
      phase: newPhase,
      current_question_id: promptId ?? currentPromptId,
      host_message: null,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      console.error('Quiplash setPhase error:', error);
    }
    // Fetch immediately — don't rely solely on Realtime to reflect the change
    await fetchRemoteState();
  };

  const startGame = () => setPhase('answering', 1);

  const showVoting = () => setPhase('voting');

  const revealResults = () => {
    const sorted = [...answers].sort((a, b) => b.votes - a.votes);
    if (sorted.length > 0 && sorted[0].votes > 0) {
      const winner = sorted[0];
      setScores(prev => ({ ...prev, [winner.player_name]: (prev[winner.player_name] || 0) + 1000 }));
    }
    setPhase('results');
  };

  const nextPrompt = () => {
    const nextId = currentPromptId < QUIPLASH_PROMPTS.length
      ? currentPromptId + 1
      : 1;
    setMyAnswer('');
    setSubmitted(false);
    setPhase('answering', nextId);
  };

  // --- Player actions ---
  const submitAnswer = async () => {
    if (!myAnswer.trim() || !currentUser || submitted || loading) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('lando_party_quiplash').insert({
        prompt_id: currentPromptId,
        player_name: currentUser.name,
        answer: myAnswer.trim(),
      });
      if (error) {
        console.error('Quiplash submit error:', error);
        setFlash(lang === 'fr' ? 'Erreur — réessayez! 😅' : 'Error — try again! 😅');
        setTimeout(() => setFlash(null), 2000);
        return;
      }
      setSubmitted(true);
      setFlash(lang === 'fr' ? 'Réponse soumise! 🎉' : 'Answer submitted! 🎉');
      setTimeout(() => setFlash(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  const voteForAnswer = async (answerId: string, playerName: string) => {
    if (!currentUser || loading || playerName === currentUser.name) return;
    setLoading(true);
    try {
      const answer = answers.find(a => a.id === answerId);
      if (!answer) return;
      await supabase.from('lando_party_quiplash')
        .update({ votes: answer.votes + 1 })
        .eq('id', answerId);
      setFlash(lang === 'fr' ? `Tu as voté pour ${playerName}! 👍` : `You voted for ${playerName}! 👍`);
      setTimeout(() => setFlash(null), 2000);
      fetchAnswers();
    } finally {
      setLoading(false);
    }
  };

  const sortedAnswers = [...answers].sort(() => 0.5 - Math.random());
  const sortedByVotes = [...answers].sort((a, b) => b.votes - a.votes);
  const winner = sortedByVotes[0];
  const promptText = currentPrompt ? (lang === 'fr' ? currentPrompt.fr : currentPrompt.en) : '';

  return (
    <div className="p-4 pb-24">
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-teal-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        💬 Quiplash!
      </h2>
      <p className="text-center text-gray-400 mb-4">
        {lang === 'fr'
          ? 'Complétez la phrase de façon drôle et votez pour la meilleure!'
          : 'Complete the sentence funnily and vote for the best!'}
      </p>

      {/* Host controls info */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 bg-blue-500/20 border border-blue-500/40 text-blue-300 text-sm px-3 py-1 rounded-full">
          🎮 {lang === 'fr' ? 'Eldar contrôle le rythme via les boutons HOST' : 'Eldar controls the pace via HOST buttons'}
        </span>
      </div>

      {/* Prompt counter */}
      <div className="flex justify-center gap-2 mb-6">
        {QUIPLASH_PROMPTS.map(p => (
          <div
            key={p.id}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              p.id === currentPromptId && phase !== 'waiting'
                ? 'bg-teal-500 text-white'
                : p.id < currentPromptId
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {p.id}
          </div>
        ))}
      </div>

      {/* Landoosh host message */}
      {remoteState?.host_message && (
        <div className="mb-4 bg-orange-500/20 border border-orange-500/40 rounded-xl p-4 text-center">
          <div className="text-orange-300 text-sm font-bold mb-1">🎭 Landoosh</div>
          <div className="text-white">{remoteState.host_message}</div>
        </div>
      )}

      {/* WAITING */}
      {(phase === 'waiting' || phase === 'finished') && (
        <div className="text-center">
          <div className="text-8xl mb-6">💬</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            {lang === 'fr' ? 'Prêt à être drôle?' : 'Ready to be funny?'}
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            {lang === 'fr'
              ? "Eldar, appuie sur le bouton pour lancer le jeu!"
              : "Eldar, press the button to start the game!"}
          </p>
          {/* HOST CONTROL — prominent start button */}
          <div className="border-2 border-dashed border-teal-400/60 rounded-2xl p-6 mb-4">
            <div className="text-xs font-bold text-teal-400 uppercase tracking-widest mb-3">
              🎮 {lang === 'fr' ? 'Contrôle HOST (Eldar)' : 'HOST Control (Eldar)'}
            </div>
            <button
              onClick={startGame}
              className="bg-teal-500 hover:bg-teal-400 text-white font-black text-2xl px-12 py-5 rounded-2xl transition-all hover:scale-105 w-full"
            >
              {lang === 'fr' ? '▶ Démarrer / Start' : '▶ Start Game'}
            </button>
          </div>
        </div>
      )}

      {/* ANSWERING */}
      {phase === 'answering' && currentPrompt && (
        <div>
          <div className="bg-gradient-to-br from-teal-900/60 to-teal-700/40 rounded-2xl p-6 mb-6 border border-teal-500/30">
            <div className="text-5xl text-center mb-4">💬</div>
            <h3 className="text-xl font-black text-gray-300 text-center mb-2">
              {lang === 'fr' ? 'Complétez:' : 'Complete the sentence:'}
            </h3>
            <p className="text-2xl text-yellow-300 text-center font-bold leading-relaxed">
              &ldquo;{promptText}&rdquo;
            </p>
          </div>

          {!currentUser && (
            <div className="text-center text-yellow-400 text-lg mb-4 p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/30">
              {lang === 'fr' ? '👆 Inscrivez-vous en haut pour jouer!' : '👆 Register above to play!'}
            </div>
          )}

          <p className="text-gray-400 text-center mb-4">
            {submitted
              ? (lang === 'fr'
                ? `Réponse soumise! En attente... (${answers.length} réponse${answers.length !== 1 ? 's' : ''})`
                : `Answer submitted! Waiting... (${answers.length} answer${answers.length !== 1 ? 's' : ''} so far)`)
              : (lang === 'fr' ? 'Écrivez une réponse drôle!' : 'Write a funny answer!')
            }
          </p>

          {!submitted && currentUser ? (
            <div>
              <textarea
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
                placeholder={lang === 'fr' ? 'Tapez votre réponse...' : 'Type your answer...'}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-xl resize-none outline-none focus:border-teal-400 transition-colors mb-4"
                rows={3}
                maxLength={80}
              />
              <button
                onClick={submitAnswer}
                disabled={!myAnswer.trim() || loading}
                className="w-full py-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-xl transition-all disabled:opacity-50"
              >
                {loading
                  ? (lang === 'fr' ? 'Envoi...' : 'Submitting...')
                  : (lang === 'fr' ? '✅ Soumettre!' : '✅ Submit!')}
              </button>
            </div>
          ) : submitted ? (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <div className="space-y-2">
                {answers.map(a => (
                  <div key={a.id} className="bg-white/10 rounded-xl p-3 text-gray-300">
                    {a.player_name} ✅
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Host controls */}
          <div className="mt-8 border-2 border-dashed border-green-500/50 rounded-2xl p-4">
            <p className="text-center text-green-400 text-xs font-bold uppercase tracking-widest mb-3">
              🎮 {lang === 'fr' ? 'Contrôle HOST (Eldar)' : 'HOST Control (Eldar)'}
            </p>
            <button
              onClick={showVoting}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg"
            >
              {lang === 'fr'
                ? `📊 Voter maintenant / Vote now${answers.length > 0 ? ` (${answers.length} réponse${answers.length !== 1 ? 's' : ''})` : ''}`
                : `📊 Vote Now${answers.length > 0 ? ` (${answers.length} answer${answers.length !== 1 ? 's' : ''})` : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* VOTING */}
      {phase === 'voting' && currentPrompt && (
        <div>
          <div className="bg-gradient-to-br from-teal-900/60 to-teal-700/40 rounded-2xl p-6 mb-6 border border-teal-500/30">
            <p className="text-2xl text-yellow-300 text-center font-bold leading-relaxed">
              &ldquo;{promptText}&rdquo;
            </p>
          </div>

          <p className="text-gray-400 text-center mb-6 text-lg">
            {lang === 'fr' ? 'Vote pour la réponse la plus drôle!' : 'Vote for the funniest answer!'}
          </p>

          <div className="space-y-3 mb-8">
            {sortedAnswers.map(answer => (
              <button
                key={answer.id}
                onClick={() => voteForAnswer(answer.id, answer.player_name)}
                disabled={answer.player_name === currentUser?.name || loading}
                className={`w-full p-4 rounded-xl text-left transition-all border ${
                  answer.player_name === currentUser?.name
                    ? 'opacity-50 cursor-not-allowed bg-gray-800 border-gray-600'
                    : 'bg-white/10 border-white/20 hover:bg-teal-500/20 hover:border-teal-400/50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-xl font-semibold">{answer.answer}</span>
                  {answer.votes > 0 && (
                    <span className="text-yellow-400 font-bold">👍 {answer.votes}</span>
                  )}
                </div>
                {answer.player_name === currentUser?.name && (
                  <div className="text-gray-500 text-sm mt-1">
                    {lang === 'fr' ? 'Votre réponse' : 'Your answer'}
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Host controls */}
          <div className="pt-4 border-2 border-dashed border-orange-500/50 rounded-2xl p-4">
            <p className="text-center text-orange-400 text-xs font-bold uppercase tracking-widest mb-3">
              🎮 {lang === 'fr' ? 'Contrôle HOST (Eldar)' : 'HOST Control (Eldar)'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={revealResults}
                className="flex-1 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black"
              >
                {lang === 'fr' ? '🏆 Révéler!' : '🏆 Reveal!'}
              </button>
              <button
                onClick={nextPrompt}
                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black"
              >
                {lang === 'fr' ? '⏭ Suivant' : '⏭ Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && currentPrompt && (
        <div className="text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-2xl font-black text-white mb-6">
            {lang === 'fr' ? 'Les résultats!' : 'The results!'}
          </h3>

          {winner && winner.votes > 0 && (
            <div className="bg-yellow-500/30 border-2 border-yellow-400 rounded-2xl p-6 mb-6">
              <div className="text-yellow-300 font-bold text-lg mb-2">
                🥇 {lang === 'fr' ? 'Gagnant!' : 'Winner!'}
              </div>
              <div className="text-3xl font-black text-white mb-2">{winner.answer}</div>
              <div className="text-gray-300">— {winner.player_name}</div>
              <div className="text-yellow-400 font-bold mt-2">
                👍 {winner.votes} {lang === 'fr' ? `vote${winner.votes !== 1 ? 's' : ''}` : `vote${winner.votes !== 1 ? 's' : ''}`}
              </div>
            </div>
          )}

          <div className="mb-6 text-left">
            <h4 className="text-xl font-bold text-white mb-3">
              {lang === 'fr' ? 'Toutes les réponses:' : 'All answers:'}
            </h4>
            {sortedByVotes.map((answer, index) => (
              <div
                key={answer.id}
                className={`flex items-center justify-between p-4 rounded-xl mb-2 ${
                  index === 0 && answer.votes > 0
                    ? 'bg-yellow-500/20 border border-yellow-400'
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                <div>
                  <span className="text-xl font-bold text-white">
                    {index === 0 && answer.votes > 0 ? '🥇 ' : ''}{answer.answer}
                  </span>
                  <div className="text-gray-400 text-sm">{answer.player_name}</div>
                </div>
                <div className="text-yellow-400 font-black text-xl">
                  {answer.votes > 0 ? `👍 ${answer.votes}` : ''}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={nextPrompt}
            className="w-full py-5 rounded-xl bg-teal-500 hover:bg-teal-400 text-white font-black text-2xl"
          >
            {lang === 'fr' ? '➡️ Prochaine phrase!' : '➡️ Next Prompt!'}
          </button>

          {Object.keys(scores).length > 0 && (
            <div className="mt-6 bg-white/5 rounded-2xl p-4">
              <h4 className="text-lg font-black text-white mb-3">
                {lang === 'fr' ? '🏆 Scores de la partie' : '🏆 Game Scores'}
              </h4>
              {Object.entries(scores)
                .sort(([, a], [, b]) => b - a)
                .map(([name, pts]) => (
                  <div key={name} className="flex justify-between items-center py-2 border-b border-white/10">
                    <span className="text-white font-bold">{name}</span>
                    <span className="text-yellow-400 font-black">{pts} pts</span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
