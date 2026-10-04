import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase.storage
      .from('lando-birthday-2026')
      .list('', {
        limit: 50,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      return NextResponse.json({ photos: [] });
    }

    const photos = (data || [])
      .filter(f => f.name && !f.name.startsWith('.'))
      .map(f => {
        const { data: urlData } = supabase.storage
          .from('lando-birthday-2026')
          .getPublicUrl(f.name);
        return {
          url: urlData.publicUrl,
          uploadedAt: new Date(f.created_at || 0).getTime(),
          name: f.name,
        };
      });

    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ photos: [] });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { name, adminKey } = await req.json();
    if (adminKey !== process.env.ADMIN_DELETE_KEY) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: 'missing name' }, { status: 400 });
    }
    const { error } = await supabase.storage
      .from('lando-birthday-2026')
      .remove([name]);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}
