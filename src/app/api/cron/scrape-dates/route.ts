import { NextResponse } from 'next/server';
import { getAllScrapers } from '@/lib/scrapers';
import { verifyCronSecret } from '@/lib/utils';
import { ScraperResult } from '@/types/alerts';

export async function GET(req: Request) {
  // Verificar autenticação do cron
  if (!verifyCronSecret(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const scrapers = getAllScrapers();
    const results: ScraperResult[] = [];
    const errors: string[] = [];

    for (const scraper of scrapers) {
      try {
        const result = await scraper.run();
        results.push(result);
        if (result.errors) {
          errors.push(...result.errors.map((e) => `[${result.vestibularSlug}] ${e}`));
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
        errors.push(`[${scraper.vestibularSlug}] ${errorMsg}`);
      }
    }

    const totalDates = results.reduce((acc, r) => acc + r.dates.length, 0);

    return NextResponse.json({
      success: true,
      message: `${results.length} scrapers executados, ${totalDates} datas encontradas`,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erro no cron scrape-dates:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
