import { NextResponse } from 'next/server';
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
