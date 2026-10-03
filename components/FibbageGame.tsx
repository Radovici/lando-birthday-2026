'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { FibbageAnswer, FIBBAGE_QUESTIONS } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
}

interface GameState {
  currentQuestion: number;
  phase: 'lobby' | 'answering' | 'voting' | 'results';
}

export default function FibbageGame({ currentUser }: Props) {
  const [gameState, setGameState] = useState<GameState>({ currentQuestion: 1, phase: 'lobby' });
  const [answers, setAnswers] = useState<FibbageAnswer[]>([]);
  const [myAnswer, setMyAnswer] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const currentQ = FIBBAGE_QUESTIONS.find(q => q.id === gameState.currentQuestion);

  const fetchAnswers = useCallback(async () => {
    if (!currentQ) return;
    const { data } = await supabase
      .from('lando_party_fibbage')
      .select('*')
      .eq('question_id', gameState.currentQuestion)
      .order('created_at', { ascending: true });
    if (data) setAnswers(data);
  }, [currentQ, gameState.currentQuestion]);

  useEffect(() => {
    fetchAnswers();
    const channel = supabase
      .channel('fibbage-game')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lando_party_fibbage' }, fetchAnswers)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAnswers]);

  // Check if user already submitted for this question
  useEffect(() => {
    if (currentUser && answers.some(a => a.player_name === currentUser.name && !a.is_real)) {
      setSubmitted(true);
    } else {
      setSubmitted(false);
      setMyAnswer('');
    }
  }, [answers, currentUser]);

  const submitAnswer = async () => {
    if (!myAnswer.trim() || !currentUser || submitted) return;
    setLoading(true);
    try {
      await supabase.from('lando_party_fibbage').insert({
        question_id: gameState.currentQuestion,
        player_name: currentUser.name,
        answer: myAnswer.trim(),
        is_real: false,
      });
      setSubmitted(true);
      setFlash('Answer submitted! 🎉');
      setTimeout(() => setFlash(null), 2000);
    } finally {
      setLoading(false);
    }
  };

  const showAnswers = async () => {
    if (!currentQ) return;
    // Make sure real answer is in the DB
    const exists = answers.some(a => a.is_real);
    if (!exists) {
      await supabase.from('lando_party_fibbage').insert({
        question_id: gameState.currentQuestion,
        player_name: 'Lando',
        answer: currentQ.realAnswer,
        is_real: true,
      });
    }
    setGameState(prev => ({ ...prev, phase: 'voting' }));
    fetchAnswers();
  };

  const voteForAnswer = async (answerId: string) => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const answer = answers.find(a => a.id === answerId);
      if (!answer || answer.player_name === currentUser.name) return;

      await supabase.from('lando_party_fibbage').update({
        votes: answer.votes + 1,
      }).eq('id', answerId);

      setFlash(answer.is_real ? '✅ You found the real answer!' : `😂 You picked ${answer.player_name}'s fake!`);
      setTimeout(() => setFlash(null), 3000);
      fetchAnswers();
    } finally {
      setLoading(false);
    }
  };

  const nextQuestion = () => {
    const nextId = gameState.currentQuestion < FIBBAGE_QUESTIONS.length
      ? gameState.currentQuestion + 1
      : 1;
    setGameState({ currentQuestion: nextId, phase: 'answering' });
    setMyAnswer('');
    setSubmitted(false);
  };

  const startGame = () => {
    setGameState({ currentQuestion: 1, phase: 'answering' });
    setMyAnswer('');
    setSubmitted(false);
  };

  // Shuffle answers for voting (so real answer position is random)
  const shuffledAnswers = [...answers].sort(() => 0.5 - Math.random());

  return (
    <div className="p-4 pb-24">
      {flash && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-purple-500 text-white font-black text-xl px-8 py-4 rounded-full shadow-2xl animate-bounce">
          {flash}
        </div>
      )}

      <h2 className="text-3xl font-black text-center text-white mb-2 uppercase tracking-wide">
        🎭 Fibbage — Know Lando!
      </h2>
      <p className="text-center text-gray-400 mb-6">
        Submit fake answers to fool others. Find the real one to win!
      </p>

      {/* Question counter */}
      <div className="flex justify-center gap-2 mb-6">
        {FIBBAGE_QUESTIONS.map(q => (
          <div
            key={q.id}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              q.id === gameState.currentQuestion
                ? 'bg-purple-500 text-white'
                : q.id < gameState.currentQuestion
                ? 'bg-green-500 text-white'
                : 'bg-gray-700 text-gray-400'
            }`}
          >
            {q.id}
          </div>
        ))}
      </div>

      {gameState.phase === 'lobby' && (
        <div className="text-center">
          <div className="text-8xl mb-6">🎭</div>
          <h3 className="text-2xl font-bold text-white mb-4">
            How well do you know Lando?
          </h3>
          <p className="text-gray-400 mb-8 max-w-md mx-auto">
            You'll see questions about Lando. Write a fake answer to fool others!
            The host (Eldar) controls the game on the TV.
          </p>
          <button
            onClick={startGame}
            className="bg-purple-500 hover:bg-purple-400 text-white font-black text-2xl px-12 py-5 rounded-2xl transition-all hover:scale-105"
          >
            🎮 START GAME!
          </button>
        </div>
      )}

      {gameState.phase === 'answering' && currentQ && (
        <div>
          <div className="bg-gradient-to-br from-purple-900/60 to-purple-700/40 rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="text-5xl text-center mb-4">{currentQ.emoji}</div>
            <h3 className="text-2xl font-black text-white text-center mb-2">
              Question {currentQ.id}
            </h3>
            <p className="text-xl text-yellow-300 text-center font-bold">
              "{currentQ.question}"
            </p>
          </div>

          <p className="text-gray-400 text-center mb-4">
            {submitted
              ? `Answer submitted! Waiting for others... (${answers.filter(a => !a.is_real).length} answers so far)`
              : 'Write a convincing FAKE answer to fool people!'
            }
          </p>

          {!submitted ? (
            <div>
              <textarea
                value={myAnswer}
                onChange={e => setMyAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white text-xl resize-none outline-none focus:border-purple-400 transition-colors mb-4"
                rows={3}
                maxLength={80}
              />
              <button
                onClick={submitAnswer}
                disabled={!myAnswer.trim() || !currentUser || loading}
                className="w-full py-5 rounded-xl bg-purple-500 hover:bg-purple-400 text-white font-black text-xl transition-all disabled:opacity-50"
              >
                {loading ? 'Submitting...' : '✅ Submit My Answer!'}
              </button>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-6xl mb-4">⏳</div>
              <p className="text-gray-300 text-lg mb-4">
                {answers.filter(a => !a.is_real).length} player{answers.filter(a => !a.is_real).length !== 1 ? 's' : ''} answered
              </p>
              <div className="space-y-2">
                {answers.filter(a => !a.is_real).map(a => (
                  <div key={a.id} className="bg-white/10 rounded-xl p-3 text-gray-300">
                    {a.player_name} submitted ✅
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Host controls */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-center text-gray-500 text-sm mb-3">Host controls (Eldar):</p>
            <button
              onClick={showAnswers}
              className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 text-white font-black text-lg"
            >
              📺 Show All Answers on TV
            </button>
          </div>
        </div>
      )}

      {gameState.phase === 'voting' && currentQ && (
        <div>
          <div className="bg-gradient-to-br from-purple-900/60 to-purple-700/40 rounded-2xl p-6 mb-6 border border-purple-500/30">
            <div className="text-5xl text-center mb-2">{currentQ.emoji}</div>
            <p className="text-xl text-yellow-300 text-center font-bold">
              "{currentQ.question}"
            </p>
          </div>

          <p className="text-gray-400 text-center mb-6 text-lg">
            Which one is Lando's REAL answer? Tap to vote!
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
                    : 'bg-white/10 border-white/20 hover:bg-white/20 hover:border-white/40 hover:scale-101'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-white text-xl font-semibold">{answer.answer}</span>
                  {answer.votes > 0 && (
                    <span className="text-yellow-400 font-bold">👍 {answer.votes}</span>
                  )}
                </div>
                {answer.player_name === currentUser?.name && (
                  <div className="text-gray-500 text-sm mt-1">Your answer</div>
                )}
              </button>
            ))}
          </div>

          {/* Host controls */}
          <div className="pt-6 border-t border-white/10">
            <p className="text-center text-gray-500 text-sm mb-3">Host controls:</p>
            <div className="flex gap-3">
              <button
                onClick={() => setGameState(prev => ({ ...prev, phase: 'results' }))}
                className="flex-1 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-black"
              >
                🎯 Reveal Answer!
              </button>
              <button
                onClick={nextQuestion}
                className="flex-1 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black"
              >
                ➡️ Next Question
              </button>
            </div>
          </div>
        </div>
      )}

      {gameState.phase === 'results' && currentQ && (
        <div className="text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-2xl font-black text-white mb-2">The real answer was...</h3>
          <div className="bg-green-500/30 border-2 border-green-400 rounded-2xl p-6 mb-6">
            <div className="text-4xl font-black text-green-300">{currentQ.realAnswer}</div>
            <div className="text-gray-400 mt-2">That's what Lando said! 🎉</div>
          </div>

          <div className="mb-6">
            <h4 className="text-xl font-bold text-white mb-3">All Answers & Votes:</h4>
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
                  <div className="text-gray-400 text-sm">{answer.is_real ? '(Real answer!)' : `by ${answer.player_name}`}</div>
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
            ➡️ Next Question!
          </button>
        </div>
      )}
    </div>
  );
}
