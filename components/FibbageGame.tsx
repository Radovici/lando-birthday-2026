'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FibbageAnswer, FIBBAGE_QUESTIONS, Lang } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
  lang: Lang;
}

interface RemoteGameState {
  phase: string;
  current_question_id: number;
  host_message: string | null;
}

export default function FibbageGame({ currentUser, lang }: Props) {
  const [remoteState, setRemoteState] = useState<RemoteGameState | null>(null);
  const [answers, setAnswers] = useState<FibbageAnswer[]>([]);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  // Derive local display state from remoteState (or defaults)
  const phase = (remoteState?.phase ?? 'waiting') as 'waiting' | 'answering' | 'voting' | 'results' | 'finished';
  const currentQuestionId = remoteState?.current_question_id ?? 1;
  const currentQ = FIBBAGE_QUESTIONS.find(q => q.id === currentQuestionId);

  // --- Remote game state subscription ---
  const fetchRemoteState = useCallback(async () => {
    const { data } = await supabase
      .from('lando_party_game_state')
      .select('*')
      .eq('id', 'fibbage')
      .single();
    if (data) setRemoteState(data);
  }, []);

  useEffect(() => {
    fetchRemoteState();
    const channel = supabase
      .channel('fibbage-game-state')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_game_state', filter: 'id=eq.fibbage' }, () => {
        fetchRemoteState();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchRemoteState]);

  // --- Answers subscription ---
  const fetchAnswers = useCallback(async () => {
    if (!currentQ) return;
    const { data } = await supabase
      .from('lando_party_fibbage')
      .select('*')
      .eq('question_id', currentQuestionId)
      .order('created_at', { ascending: true });
    if (data) setAnswers(data);
  }, [currentQ, currentQuestionId]);

  useEffect(() => {
    fetchAnswers();
    const channel = supabase
      .channel('fibbage-answers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_fibbage' }, fetchAnswers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAnswers]);

  // Reset submission tracking when question changes
  useEffect(() => {
    if (currentUser) {
      const alreadySubmitted = answers.some(a => a.player_name === currentUser.name && !a.is_real);
      setSubmitted(alreadySubmitted);
      if (!alreadySubmitted) setMyAnswer('');
    } else {
      setSubmitted(false);
      setMyAnswer('');
    }
  }, [answers, currentUser]);

  // --- Host controls (write to game_state) ---
  const setPhase = async (newPhase: string, questionId?: number) => {
    await supabase.from('lando_party_game_state').upsert({
      id: 'fibbage',
      phase: newPhase,
      current_question_id: questionId ?? currentQuestionId,
      updated_at: new Date().toISOString(),
    });
  };

  const startGame = () => setPhase('answering', 1);

  const showAnswers = async () => {
    if (!currentQ) return;
    const exists = answers.some(a => a.is_real);
    if (!exists) {
      await supabase.from('lando_party_fibbage').insert({
        question_id: currentQuestionId,
        player_name: 'Lando',
        answer: lang === 'fr' ? currentQ.realAnswerFR : currentQ.realAnswer,
        is_real: true,
      });
    }
    await setPhase('voting');
    fetchAnswers();
  };

  const nextQuestion = () => {
    const nextId = currentQuestionId < FIBBAGE_QUESTIONS.length
      ? currentQuestionId + 1
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
      const { error } = await supabase.from('lando_party_fibbage').insert({
        question_id: currentQuestionId,
        player_name: currentUser.name,
        answer: myAnswer.trim(),
        is_real: false,
      });
      if (error) {
        console.error('Submit error:', error);
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

  const voteForAnswer = async (answerId: string) => {
    if (!currentUser || loading) return;
    const answer = answers.find(a => a.id === answerId);
    if (!answer || answer.player_name === currentUser.name) return;

    setLoading(true);
    try {
      await supabase.from('lando_party_fibbage').update({
        votes: answer.votes + 1,
      }).eq('id', answerId);

      setFlash(answer.is_real
        ? (lang === 'fr' ? '✅ Tu as trouvé la vraie réponse!' : '✅ You found the real answer!')
        : (lang === 'fr' ? `😂 Tu as choisi le faux de ${answer.player_name}!` : `😂 You picked ${answer.player_name}'s fake!`));
      setTimeout(() => setFlash(null), 3000);
      fetchAnswers();
    } finally {
      setLoading(false);
    }
  };

  const shuffledAnswers = [...answers].sort(() => 0.5 - Math.random());
  const questionText = currentQ ? (lang === 'fr' ? currentQ.questionFR : currentQ.question) : '';

  return (
    <div className="p-4 pb-24">
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-purple-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        {lang === 'fr' ? '🎭 Fibbage — Tu connais Lando?' : '🎭 Fibbage — Know Lando!'}
      </h2>
      <p className="text-center text-gray-400 mb-4">
        {lang === 'fr'
          ? 'Soumettez de fausses réponses. Trouvez la vraie pour gagner!'
          : 'Submit fake answers to fool others. Find the real one to win!'}
      </p>

      {/* Landoosh MC indicator */}
      <div className="text-center mb-4">
        <span className="inline-flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 text-orange-300 text-sm px-3 py-1 rounded-full">
          🎭 {lang === 'fr' ? 'Landoosh contrôle le jeu via le chat' : 'Landoosh controls the game via chat'}
        </span>
      </div>

      {/* Question counter */}
      <div className="flex justify-center gap-2 mb-6">
        {FIBBAGE_QUESTIONS.map(q => (
          <div
            key={q.id}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              q.id === currentQuestionId && phase !== 'waiting'
                ? 'bg-purple-500 text-white'
                : q.id < currentQuestionId
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {q.id}
          </div>
        ))}
      </div>

      {/* Host message from Landoosh */}
      {remoteState?.host_message && (
        <div className="mb-4 bg-orange-500/20 border border-orange-500/40 rounded-xl p-4 text-center">
          <div className="text-orange-300 text-sm font-bold mb-1">🎭 Landoosh</div>
          <div className="text-white">{remoteState.host_message}</div>
        </div>
      )}

      {/* WAITING / LOBBY */}
      {(phase === 'waiting' || phase === 'finished') && (
        <div className="text-center">
          <div className="text-8xl mb-6">🎭</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            {lang === 'fr' ? 'Tu connais bien Lando?' : 'How well do you know Lando?'}
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            {lang === 'fr'
              ? "Demandez à Landoosh dans le chat de lancer le jeu, ou utilisez le bouton ci-dessous."
              : "Ask Landoosh in the chat to start the game, or use the button below."}
          </p>
          <button
            onClick={startGame}
            className="bg-purple-500 hover:bg-purple-400 text-white font-black text-2xl px-12 py-5 rounded-2xl transition-all hover:scale-105"
          >
            {lang === 'fr' ? '🎮 COMMENCER!' : '🎮 START GAME!'}
          </button>
        </div>
      )}

      {/* ANSWERING */}
      {phase === 'answering' && currentQ && (
        <div>
          <div className="bg-gradient-to-br from-purple-900/60 to-purple-700/40 rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="text-5xl text-center mb-4">{currentQ.emoji}</div>
            <h3 className="text-2xl font-black text-white text-center mb-2">
              {lang === 'fr' ? 'Question' : 'Question'} {currentQuestionId}
            </h3>
            <p className="text-xl text-yellow-300 text-center font-bold">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          {/* Register prompt */}
          {!currentUser && (
            <div className="text-center text-yellow-400 text-lg mb-4 p-4 bg-yellow-400/10 rounded-xl border border-yellow-400/30">
              {lang === 'fr' ? '👆 Inscrivez-vous en haut pour répondre!' : '👆 Register above to submit an answer!'}
            </div>
          )}

          <p className="text-gray-400 text-center mb-4">
            {submitted
              ? (lang === 'fr'
                ? `Réponse soumise! En attente... (${answers.filter(a => !a.is_real).length} réponse${answers.filter(a => !a.is_real).length !== 1 ? 's' : ''})`
                : `Answer submitted! Waiting... (${answers.filter(a => !a.is_real).length} answer${answers.filter(a => !a.is_real).length !== 1 ? 's' : ''} so far)`)
              : (lang === 'fr'
                ? 'Écris une fausse réponse convaincante!'
                : 'Write a convincing FAKE answer!')
            }
          </p>

          {!submitted && currentUser ? (
            <div>
              <textarea
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
                placeholder={lang === 'fr' ? 'Tape ta réponse ici...' : 'Type your answer here...'}
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-xl resize-none outline-none focus:border-purple-400 transition-colors mb-4"
                rows={3}
                maxLength={80}
              />
              <button
                onClick={submitAnswer}
                disabled={!myAnswer.trim() || loading}
                className="w-full py-5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xl transition-all disabled:opacity-50"
              >
                {loading
                  ? (lang === 'fr' ? 'Envoi...' : 'Submitting...')
                  : (lang === 'fr' ? '✅ Soumettre ma réponse!' : '✅ Submit My Answer!')}
              </button>
            </div>
          ) : submitted ? (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-300 text-lg mb-4">
                {lang === 'fr'
                  ? `${answers.filter(a => !a.is_real).length} joueur${answers.filter(a => !a.is_real).length !== 1 ? 's' : ''} a répondu`
                  : `${answers.filter(a => !a.is_real).length} player${answers.filter(a => !a.is_real).length !== 1 ? 's' : ''} answered`}
              </p>
              <div className="space-y-2">
                {answers.filter(a => !a.is_real).map(a => (
                  <div key={a.id} className="bg-white/10 rounded-xl p-3 text-gray-300">
                    {a.player_name} {lang === 'fr' ? 'a répondu ✅' : 'submitted ✅'}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Host controls */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-gray-500 text-sm mb-3">
              {lang === 'fr' ? 'Contrôles animateur (Eldar / Landoosh):' : 'Host controls (Eldar / Landoosh):'}
            </p>
            <button
              onClick={showAnswers}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg"
            >
              {lang === 'fr' ? '📺 Afficher les réponses — voter!' : '📺 Show All Answers — Start Voting!'}
            </button>
          </div>
        </div>
      )}

      {/* VOTING */}
      {phase === 'voting' && currentQ && (
        <div>
          <div className="bg-gradient-to-br from-purple-900/60 to-purple-700/40 rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="text-5xl text-center mb-2">{currentQ.emoji}</div>
            <p className="text-xl text-yellow-300 text-center font-bold">
              &ldquo;{questionText}&rdquo;
            </p>
          </div>

          <p className="text-gray-400 text-center mb-6 text-lg">
            {lang === 'fr'
              ? 'Laquelle est la VRAIE réponse de Lando? Tapez pour voter!'
              : "Which one is Lando's REAL answer? Tap to vote!"}
          </p>

          <div className="space-y-3 mb-8">
            {shuffledAnswers.map((answer) => (
              <button
                key={answer.id}
                onClick={() => voteForAnswer(answer.id)}
                disabled={answer.player_name === currentUser?.name || loading}
                className={`w-full p-4 rounded-xl text-left transition-all border ${
                  answer.player_name === currentUser?.name
                    ? 'opacity-50 cursor-not-allowed bg-gray-800 border-gray-600'
                    : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40'
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
          <div className="pt-6 border-t border-white/10">
            <p className="text-center text-gray-500 text-sm mb-3">
              {lang === 'fr' ? 'Contrôles animateur:' : 'Host controls:'}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setPhase('results')}
                className="flex-1 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black"
              >
                {lang === 'fr' ? '🎯 Révéler!' : '🎯 Reveal!'}
              </button>
              <button
                onClick={nextQuestion}
                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black"
              >
                {lang === 'fr' ? '➡️ Suivant' : '➡️ Next'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESULTS */}
      {phase === 'results' && currentQ && (
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-black text-white mb-2">
            {lang === 'fr' ? 'La vraie réponse était...' : 'The real answer was...'}
          </h3>
          <div className="bg-green-500/30 border-2 border-green-400 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-black text-green-300">
              {lang === 'fr' ? currentQ.realAnswerFR : currentQ.realAnswer}
            </div>
            <div className="text-gray-400 mt-2">
              {lang === 'fr' ? "C'est ce qu'a dit Lando! 🎉" : "That's what Lando said! 🎉"}
            </div>
          </div>

          <div className="mb-6 text-left">
            <h4 className="text-xl font-bold text-white mb-3">
              {lang === 'fr' ? 'Toutes les réponses & votes:' : 'All Answers & Votes:'}
            </h4>
            {[...answers].sort((a, b) => b.votes - a.votes).map(answer => (
              <div
                key={answer.id}
                className={`flex items-center justify-between p-4 rounded-xl mb-2 ${
                  answer.is_real
                    ? 'bg-green-500/30 border border-green-400'
                    : 'bg-white/10 border border-white/20'
                }`}
              >
                <div>
                  <span className={`text-xl font-bold ${answer.is_real ? 'text-green-300' : 'text-white'}`}>
                    {answer.is_real ? '✅ ' : ''}{answer.answer}
                  </span>
                  <div className="text-gray-400 text-sm">
                    {answer.is_real
                      ? (lang === 'fr' ? '(Vraie réponse!)' : '(Real answer!)')
                      : `${lang === 'fr' ? 'par' : 'by'} ${answer.player_name}`}
                  </div>
                </div>
                <div className="text-yellow-400 font-black text-xl">
                  {answer.votes > 0 ? `👍 ${answer.votes}` : ''}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={nextQuestion}
            className="w-full py-5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-2xl"
          >
            {lang === 'fr' ? '➡️ Question suivante!' : '➡️ Next Question!'}
          </button>
        </div>
      )}
    </div>
  );
}
