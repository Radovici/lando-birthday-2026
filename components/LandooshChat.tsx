'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  currentUser: { name: string; kidName: string } | null;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const GREETING = "🎉 HEY HEY HEY! I'm LANDOOSH, your party game host for the day! I'm here to make Lando's 7th birthday THE BEST PARTY EVER!! Ask me anything about the party, challenge me to a trivia question, or just say hi! LET'S GO!! 🎈🎊⭐";

export default function LandooshChat({ currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: GREETING, timestamp: Date.now() },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.filter(m => m.role === 'user').map(m => ({
            role: m.role,
            content: m.content,
          })),
          userName: currentUser?.name,
        }),
      });

      const data = await res.json();
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.content || "PARTY ON! 🎉", timestamp: Date.now() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: "Oops! Let me catch my breath... 🎈 What were you saying?", timestamp: Date.now() },
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

  const QUICK_PROMPTS = [
    "What's the score? 🏆",
    "Tell me a fun fact about Lando!",
    "Give a star to the nicest kid!",
    "Start a trivia question!",
    "What are the events today?",
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-160px)] max-h-[700px]">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <h2 className="text-2xl font-black text-center text-white uppercase tracking-wide">
          🤖 Talk to Landoosh
        </h2>
        <p className="text-center text-gray-400 text-sm mt-1">
          Your AI party game host!
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
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
          {QUICK_PROMPTS.map(prompt => (
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
            placeholder={currentUser ? `Say something, ${currentUser.name}!` : 'Type a message...'}
            className="flex-1 bg-white/10 border border-white/20 rounded-xl px-5 py-4 text-white text-lg outline-none focus:border-orange-400 transition-colors"
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black text-xl px-6 py-4 rounded-xl disabled:opacity-50 hover:scale-105 transition-all"
          >
            🚀
          </button>
        </div>
      </div>
    </div>
  );
}
