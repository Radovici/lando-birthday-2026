import { NextRequest, NextResponse } from 'next/server';

const AIDE_BACKEND_URL = process.env.AIDE_BACKEND_URL || 'https://aide-api-radovici.fly.dev';
const AIDE_SERVICE_KEY = process.env.AIDE_SERVICE_KEY!;
const LANDOOSH_BRIDGE = process.env.LANDOOSH_BRIDGE || 'commercial';
const LANDOOSH_TERMINAL = process.env.LANDOOSH_TERMINAL || 'landoosh';

export async function POST(req: NextRequest) {
  try {
    const { messages, userName } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages required' }, { status: 400 });
    }

    const systemPrefix = userName
      ? `The party guest talking to you is ${userName}. `
      : '';

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
            content: `[System context: ${systemPrefix}You are at Lando's 7th birthday party on October 4, 2026. Be fun, energetic, and kid-friendly!]\n\n${messages[messages.length - 1]?.content || ''}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AIDE error:', errorText);
      return NextResponse.json({ error: 'AI unavailable' }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json({ content: data.content || "PARTY TIME! Let's go! 🎉" });
  } catch (err) {
    console.error('Chat error:', err);
    return NextResponse.json({ content: "WHOOPS! Let's keep the party going anyway! 🎈" });
  }
}
