import { createServiceClient } from '@/lib/supabase';
import { ScrapedDate, ScraperResult } from '@/types/alerts';

export abstract class BaseScraper {
  abstract vestibularSlug: string;
  abstract scrapeUrl: string;

  abstract parseDates(): Promise<ScrapedDate[]>;

  async run(): Promise<ScraperResult> {
    const errors: string[] = [];
    let dates: ScrapedDate[] = [];

    try {
      dates = await this.parseDates();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido no scraping';
      errors.push(errorMsg);
      console.error(`[Scraper ${this.vestibularSlug}] Erro:`, errorMsg);
    }

    if (dates.length > 0) {
      try {
        await this.saveDates(dates);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Erro ao salvar datas';
        errors.push(errorMsg);
        console.error(`[Scraper ${this.vestibularSlug}] Erro ao salvar:`, errorMsg);
      }
    }

    return {
      vestibularSlug: this.vestibularSlug,
      dates,
      scrapedAt: new Date().toISOString(),
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async saveDates(dates: ScrapedDate[]) {
    const supabase = createServiceClient();

    // Buscar o vestibular_id pelo slug
    const { data: vestibular, error: vestError } = await supabase
      .from('vestibulares')
      .select('id')
      .eq('slug', this.vestibularSlug)
      .single();

    if (vestError || !vestibular) {
      throw new Error(`Vestibular não encontrado: ${this.vestibularSlug}`);
    }

    for (const date of dates) {
      const { error } = await supabase
        .from('important_dates')
        .upsert(
          {
            vestibular_id: vestibular.id,
            event_type: date.eventType,
            event_name: date.eventName,
            event_date: date.eventDate,
            event_end_date: date.eventEndDate || null,
            source: 'scraped' as const,
            scraped_at: new Date().toISOString(),
          },
          {
            onConflict: 'vestibular_id,event_type,event_date',
            ignoreDuplicates: false,
          }
        );

      if (error) {
        console.error(`[Scraper ${this.vestibularSlug}] Erro upsert:`, error);
      }
    }
  }
}
