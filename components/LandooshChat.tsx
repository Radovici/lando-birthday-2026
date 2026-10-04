'use client';

import { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Lang } from '@/lib/types';

interface Props {
  currentUser: { name: string; kidName: string } | null;
  lang: Lang;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  gameCommandApplied?: string;
}

interface GameCommand {
  game: string;
  params: Record<string, string>;
}

const GREETING_FR = "🎉 COUCOU COUCOU! Je suis LANDOOSH, votre animateur IA pour la fête d'aujourd'hui! Je suis là pour que le 7ème anniversaire de Lando soit LA MEILLEURE FÊTE EVER!! Demandez-moi de lancer Fibbage ou Quiplash, ou parlez-moi juste! ALLONS-Y!! 🎈🎊⭐";
const GREETING_EN = "🎉 HEY HEY HEY! I'm LANDOOSH, your party game host for the day! Ask me to start Fibbage or Quiplash, or just say hi! LET'S GO!! 🎈🎊⭐";

const QUICK_PROMPTS_FR = [
  'Lance Fibbage! 🎭',
  'Lance Quiplash! 💬',
  'Question suivante! ➡️',
  'Affiche les réponses! 📺',
  'Révèle les résultats! 🏆',
];

const QUICK_PROMPTS_EN = [
  'Start Fibbage! 🎭',
  'Start Quiplash! 💬',
  'Next question! ➡️',
  'Show answers! 📺',
  'Reveal results! 🏆',
];

export default function LandooshChat({ currentUser, lang }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: lang === 'fr' ? GREETING_FR : GREETING_EN,
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].role === 'assistant') {
        return [{ role: 'assistant', content: lang === 'fr' ? GREETING_FR : GREETING_EN, timestamp: Date.now() }];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const applyGameCommand = async (cmd: GameCommand): Promise<string> => {
    const phase = cmd.params.phase || 'waiting';
    const questionId = cmd.params.question ? parseInt(cmd.params.question, 10) : null;

    try {
      await supabase
        .from('lando_party_game_state')
        .upsert({
          id: cmd.game,
          phase,
          current_question_id: questionId,
          host_message: null,
          updated_at: new Date().toISOString(),
        });
    } catch (err) {
      console.error('Failed to apply game command:', err);
    }

    const label = cmd.game === 'fibbage' ? 'Fibbage' : 'Quiplash';
    const phaseLabel: Record<string, { fr: string; en: string }> = {
      waiting: { fr: 'en attente', en: 'waiting' },
      answering: { fr: `réponses ouvertes (Q${questionId})`, en: `answers open (Q${questionId})` },
      voting: { fr: `vote en cours (Q${questionId})`, en: `voting open (Q${questionId})` },
      results: { fr: `résultats (Q${questionId})`, en: `results (Q${questionId})` },
      finished: { fr: 'terminé', en: 'finished' },
    };
    const phaseStr = phaseLabel[phase]?.[lang] ?? phase;
    return lang === 'fr'
      ? `🎮 ${label} : ${phaseStr}`
      : `🎮 ${label}: ${phaseStr}`;
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    const newMessages: Message[] = [
      ...messages,
      { role: 'user', content: userMessage, timestamp: Date.now() },
    ];
    setMessages(newMessages);
    setLoading(true);

    const langNote = lang === 'fr' ? ' Réponds en français.' : ' Respond in English.';

    try {
      const res = await fetch('/party/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role === 'user').map(m => ({
            role: m.role,
            content: m.content,
          })),
          userName: currentUser?.name,
          langNote,
        }),
      });

      const data = await res.json();
      const content: string = data.content || (lang === 'fr' ? 'FAISONS LA FÊTE! 🎉' : 'PARTY ON! 🎉');
      const gameCommands: GameCommand[] | undefined = data.gameCommands;

      // Apply any game commands
      let commandNotice: string | undefined;
      if (gameCommands && gameCommands.length > 0) {
        const notices: string[] = [];
        for (const cmd of gameCommands) {
          const notice = await applyGameCommand(cmd);
          notices.push(notice);
        }
        commandNotice = notices.join(' · ');
      }

      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content,
          timestamp: Date.now(),
          gameCommandApplied: commandNotice,
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: lang === 'fr'
            ? "Oups! Qu'est-ce que tu disais? 🎈"
            : "Oops! Let me catch my breath... 🎈 What were you saying?",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = lang === 'fr' ? QUICK_PROMPTS_FR : QUICK_PROMPTS_EN;

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-2xl font-black text-center text-white uppercase tracking-wide">
          {lang === 'fr' ? '🤖 Parlez à Landoosh' : '🤖 Talk to Landoosh'}
        </h2>
        <p className="text-center text-gray-400 text-sm mt-1">
          {lang === 'fr' ? 'Votre animateur IA de fête — contrôle aussi les jeux!' : 'Your AI party host — controls the games too!'}
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i}>
            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl mr-3 flex-shrink-0 mt-1">
                  🎭
                </div>
              )}
              <div
                className={`max-w-[80%] px-5 py-3 text-white text-lg leading-relaxed ${
                  msg.role === 'user'
                    ? 'chat-bubble-user'
                    : 'chat-bubble-ai'
                }`}
              >
                {msg.content}
              </div>
            </div>
            {msg.gameCommandApplied && (
              <div className="flex justify-start mt-1 pl-[52px]">
                <div className="bg-teal-500/20 border border-teal-500/40 rounded-xl px-4 py-2 text-teal-300 text-sm font-semibold">
                  {msg.gameCommandApplied}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-500 to-pink-500 flex items-center justify-center text-xl mr-3 flex-shrink-0">
              🎭
            </div>
            <div className="chat-bubble-ai px-5 py-3 text-white text-2xl">
              <span className="animate-bounce inline-block">.</span>
              <span className="animate-bounce inline-block" style={{ animationDelay: '0.1s' }}>.</span>
              <span className="animate-bounce inline-block" style={{ animationDelay: '0.2s' }}>.</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick prompts */}
      <div className="px-4 py-2 overflow-x-auto">
        <div className="flex gap-2 flex-nowrap pb-1">
          {quickPrompts.map(prompt => (
            <button
              key={prompt}
              onClick={() => { setInput(prompt); inputRef.current?.focus(); }}
              className="flex-shrink-0 px-4 py-2 rounded-full bg-white/10 text-white text-sm hover:bg-white/20 border border-white/20 whitespace-nowrap"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              currentUser
                ? (lang === 'fr' ? `Dites quelque chose, ${currentUser.name}!` : `Say something, ${currentUser.name}!`)
                : (lang === 'fr' ? 'Tapez un message...' : 'Type a message...')
            }
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white outline-none focus:border-orange-400 transition-colors"
            style={{ fontSize: '16px' }}
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black text-xl px-6 rounded-xl disabled:opacity-50 transition-all min-h-[52px]"
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
}
