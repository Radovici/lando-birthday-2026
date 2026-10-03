'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Lang } from '@/lib/types';

interface Props {
  onRegister: (user: { name: string; kidName: string }) => void;
  lang: Lang;
  onToggleLang: () => void;
}

export default function Register({ onRegister, lang, onToggleLang }: Props) {
  const [parentName, setParentName] = useState('');
  const [kidName, setKidName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentName.trim() || !kidName.trim()) {
      setError(
        lang === 'fr'
          ? 'Remplis les deux champs!'
          : 'Please fill in both fields!'
      );
      return;
    }
    setLoading(true);
    setError('');

    try {
      const { data: existing } = await supabase
        .from('lando_party_players')
        .select('*')
        .eq('name', kidName.trim())
        .single();

      if (!existing) {
        const { error: insertError } = await supabase
          .from('lando_party_players')
          .insert({ name: kidName.trim(), parent_name: parentName.trim() });
        if (insertError) throw insertError;
      }

      onRegister({ name: parentName.trim(), kidName: kidName.trim() });
    } catch (err) {
      console.error(err);
      setError(lang === 'fr' ? 'Erreur — réessaie!' : 'Something went wrong. Try again!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="min-h-dvh flex flex-col"
      style={{ background: '#0a0a1a' }}
    >
      {/* Lang toggle — top right */}
      <div className="flex justify-end px-5 pt-4">
        <button
          type="button"
          onClick={onToggleLang}
          className="text-sm border border-white/20 rounded-lg px-4 font-bold text-white min-h-[44px]"
        >
          {lang === 'fr' ? '🇫🇷 FR' : '🇺🇸 EN'}
        </button>
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3">🎂</div>
          <h1
            className="text-5xl font-black birthday-glow leading-tight mb-2"
            style={{ fontFamily: 'Impact, Arial Black, sans-serif', color: '#FFD700' }}
          >
            {lang === 'fr' ? 'Lando a 7 ans!' : "Lando's 7th!"}
          </h1>
          <p className="text-yellow-300 text-lg font-bold">
            {lang === 'fr' ? '🎉 4 octobre 2026 🎉' : '🎉 October 4, 2026 🎉'}
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4 max-w-md mx-auto">
          <div>
            <label className="block text-white font-bold mb-2">
              {lang === 'fr' ? 'Ton prénom' : 'Your name'}
            </label>
            <input
              type="text"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder={lang === 'fr' ? 'ex. Sarah' : 'e.g. Sarah'}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white outline-none focus:border-yellow-400 transition-colors"
              autoComplete="given-name"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-white font-bold mb-2">
              {lang === 'fr' ? "Prénom de ton enfant" : "Your kid's name"}
            </label>
            <input
              type="text"
              value={kidName}
              onChange={e => setKidName(e.target.value)}
              placeholder={lang === 'fr' ? 'ex. Emma' : 'e.g. Emma'}
              className="w-full bg-white/10 border border-white/20 rounded-2xl px-5 py-4 text-white outline-none focus:border-yellow-400 transition-colors"
              autoComplete="given-name"
            />
            <p className="text-gray-500 text-sm mt-1 px-1">
              {lang === 'fr'
                ? "Tu ne peux pas donner d'étoiles à ton propre enfant 😄"
                : "You can't give stars to your own kid 😄"}
            </p>
          </div>
        </div>
      </div>

      {/* Sticky submit zone — always visible above keyboard */}
      <div
        className="shrink-0 px-5 pt-2"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 1.5rem))' }}
      >
        {error && (
          <div className="text-red-400 text-center font-semibold mb-3">{error}</div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 rounded-2xl bg-gradient-to-r from-yellow-400 to-orange-500 text-black font-black text-2xl uppercase tracking-wide transition-all active:scale-95 disabled:opacity-50"
        >
          {loading
            ? (lang === 'fr' ? 'Chargement...' : 'Joining...')
            : (lang === 'fr' ? "🎉 Rejoindre la fête!" : "🎉 Join the party!")}
        </button>
      </div>
    </form>
  );
}
