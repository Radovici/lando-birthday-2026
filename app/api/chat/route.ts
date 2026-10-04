import { NextRequest, NextResponse } from 'next/server';

const AIDE_BACKEND_URL = process.env.AIDE_BACKEND_URL || 'https://aide-api-radovici.fly.dev';
const AIDE_SERVICE_KEY = process.env.AIDE_SERVICE_KEY!;
const LANDOOSH_BRIDGE = process.env.LANDOOSH_BRIDGE || 'commercial';
const LANDOOSH_TERMINAL = process.env.LANDOOSH_TERMINAL || 'landoosh';

const GAME_CONTROL_CONTEXT = `
You are also the MC for two party games: Fibbage and Quiplash.
You can control game flow by outputting a structured command at the END of your message:
[GAME:fibbage:phase=waiting:question=1]
[GAME:fibbage:phase=answering:question=2]
[GAME:fibbage:phase=voting:question=2]
[GAME:fibbage:phase=results:question=2]
[GAME:quiplash:phase=answering:question=3]
[GAME:quiplash:phase=voting:question=3]
[GAME:quiplash:phase=results:question=3]
[GAME:quiplash:phase=waiting:question=1]
Only output a [GAME:...] command when the user explicitly asks you to advance the game, start a round, show answers, reveal results, or reset the game.
When asked to start Fibbage, output [GAME:fibbage:phase=answering:question=1] at the end.
When asked to move to next question in Fibbage, output [GAME:fibbage:phase=answering:question=N] where N is the next question number (1-8).
When asked to show answers/start voting, output the :phase=voting command.
When asked to reveal results, output :phase=results.
Do not output [GAME:...] commands unless explicitly controlling the game.
Always be fun, energetic and kid-friendly!
`;

export async function POST(req: NextRequest) {
  try {
    const { messages, userName, langNote } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const langContext = langNote || '';
    const systemPrefix = userName ? `The party guest talking to you is ${userName}. ` : '';

    const response = await fetch(`${AIDE_BACKEND_URL}/api/v1/service/agent`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AIDE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bridge_slug: LANDOOSH_BRIDGE,
        terminal_slug: LANDOOSH_TERMINAL,
        messages: [
          {
            role: 'user',
            content: `[System context: ${systemPrefix}You are at Lando's 7th birthday party on October 4, 2026. Be fun, energetic, and kid-friendly!${langContext}\n${GAME_CONTROL_CONTEXT}]\n\n${messages[messages.length - 1]?.content || ''}`,
          },
        ],
      }),
    });

    const data = await response.json();

    // Handle AIDE timeout or error gracefully with a fun in-character response
    if (!response.ok || data.detail?.includes('did not respond')) {
      const fallbacks = [
        "🎉 JE SUIS LÀ! On fait la fête!! ALLONS-Y!! 🎈",
        "🎊 WAOUH WAOUH WAOUH! C'est l'heure de s'amuser! LANCEZ LES JEUX!! ⭐",
        "🏆 LA FÊTE DE LANDO EST LA MEILLEURE!! Je recharge mes batteries... MAIS ON Y VA!! 🚀",
      ];
      const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
      return NextResponse.json({ content: fallback });
    }

    const rawContent: string = data.content || "PARTY TIME! Let's go! 🎉";

    // Parse any [GAME:...] commands from the response
    const gameCommandRegex = /\[GAME:([a-z]+):([^\]]+)\]/gi;
    const commands: Array<{ game: string; params: Record<string, string> }> = [];
    let cleanedContent = rawContent;

    let match;
    while ((match = gameCommandRegex.exec(rawContent)) !== null) {
      const game = match[1].toLowerCase();
      const paramStr = match[2];
      const params: Record<string, string> = {};
      paramStr.split(':').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) params[k.trim()] = v.trim();
      });
      commands.push({ game, params });
    }

    // Remove [GAME:...] from the displayed content
    cleanedContent = cleanedContent.replace(/\s*\[GAME:[^\]]+\]/gi, '').trim();

    return NextResponse.json({
      content: cleanedContent,
      gameCommands: commands.length > 0 ? commands : undefined,
    });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ content: "WHOOPS! Let's keep the party going anyway! 🎈" });
  }
}
