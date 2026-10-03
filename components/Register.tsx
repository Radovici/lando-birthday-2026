'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Props {
  onRegister: (user: { name: string; kidName: string }) => void;
}

export default function Register({ onRegister }: Props) {
  const [parentName, setParentName] = useState('');
  const [kidName, setKidName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !kidName.trim()) {
      setError('Please fill in both fields!');
      return;
    }
    setLoading(true);
    setError('');

    try {
      // Check if kid already exists
      const { data: existing } = await supabase
        .from('lando_party_players')
        .select('*')
        .eq('name', kidName.trim())
        .single();

      if (!existing) {
        // Register the kid
        const { error: insertError } = await supabase
          .from('lando_party_players')
          .insert({
            name: kidName.trim(),
            parent_name: parentName.trim(),
          });

        if (insertError) throw insertError;
      }

      onRegister({ name: parentName.trim(), kidName: kidName.trim() });
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#0a0a1a' }}>
      {/* Floating emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {['🎈', '🎉', '⭐', '🎊', '🏆', '🎂', '🎈', '⭐'].map((emoji, i) => (
          <div
            key={i}
            className="absolute text-5xl animate-bounce opacity-20"
            style={{
              left: `${5 + i * 13}%`,
              top: `${10 + (i % 4) * 20}%`,
              animationDelay: `${i * 0.4}s`,
              animationDuration: `${2 + i * 0.3}s`,
            }}
          >
            {emoji}
          </div>
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-8xl mb-4">🎂</div>
          <h1
            className="text-5xl font-black birthday-glow leading-tight mb-3"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif', color: '#FFD700' }}
          >
            LANDO'S 7TH BIRTHDAY!
          </h1>
          <p className="text-gray-300 text-xl">October 4, 2026</p>
          <p className="text-gray-400 mt-2">Join the party! 🎊</p>
        </div>

        {/* Register form */}
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10 backdrop-blur">
          <h2 className="text-2xl font-black text-white mb-6 text-center">Join the Party!</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-gray-300 font-semibold mb-2 text-lg">
                Your name (parent):
              </label>
              <input
                type="text"
                value={parentName}
                onChange={e => setParentName(e.target.value)}
                placeholder="e.g. Sarah"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-xl outline-none focus:border-yellow-400 transition-colors"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-gray-300 font-semibold mb-2 text-lg">
                Your kid's name:
              </label>
              <input
                type="text"
                value={kidName}
                onChange={e => setKidName(e.target.value)}
                placeholder="e.g. Emma"
                className="w-full bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-xl outline-none focus:border-yellow-400 transition-colors"
              />
              <p className="text-gray-500 text-sm mt-1">
                You can't give stars/demerits to your own kid 😄
              </p>
            </div>

            {error && (
              <div className="text-red-400 text-center font-semibold">{error}</div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl uppercase tracking-wide transition-all hover:scale-105 hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] disabled:opacity-50"
            >
              {loading ? 'Joining...' : "🎉 LET'S PARTY!"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-600 text-sm mt-4">
          No account needed — just jump in!
        </p>
      </div>
    </div>
  );
}
