import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { getAllScrapers } from '@/lib/scrapers';
import { ScraperResult } from '@/types/alerts';
import { Profile } from '@/types/database';

export async function POST() {
  try {
    // Verificar se é admin
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const scrapers = getAllScrapers();
    const results: ScraperResult[] = [];

    for (const scraper of scrapers) {
      const result = await scraper.run();
      results.push(result);
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Erro ao executar scrapers:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
