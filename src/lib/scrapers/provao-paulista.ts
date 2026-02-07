import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedDate } from '@/types/alerts';

export class ProvaoPaulistaScraper extends BaseScraper {
  vestibularSlug = 'provao-paulista';
  scrapeUrl = 'https://www.educacao.sp.gov.br/provao-paulista';

  async parseDates(): Promise<ScrapedDate[]> {
    const response = await fetch(this.scrapeUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ao acessar ${this.scrapeUrl}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    const dates: ScrapedDate[] = [];

    // Buscar por textos com datas no corpo da página
    $('div.entry-content, div.content, article, main').each((_, element) => {
      const text = $(element).text();

      // Padrão: "Inscrições de XX/XX a XX/XX/XXXX"
      const inscricaoMatch = text.match(
        /inscri[çc][õo]es?\s*(?:de|:)?\s*(\d{1,2}\/\d{1,2}(?:\/\d{4})?)\s*(?:a|até|à)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (inscricaoMatch) {
        const endDate = this.parseBrDate(inscricaoMatch[2]);
        const startDate = inscricaoMatch[1].split('/').length === 3
          ? this.parseBrDate(inscricaoMatch[1])
          : this.parseBrDateWithYear(inscricaoMatch[1], endDate);
        dates.push({
          eventType: 'inscricao',
          eventName: 'Inscrições Provão Paulista',
          eventDate: startDate,
          eventEndDate: endDate,
        });
      }

      // Padrão: "Prova: XX/XX/XXXX"
      const provaMatch = text.match(
        /prova\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (provaMatch) {
        dates.push({
          eventType: 'prova',
          eventName: 'Prova Provão Paulista',
          eventDate: this.parseBrDate(provaMatch[1]),
        });
      }

      // Resultado
      const resultadoMatch = text.match(
        /resultado\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (resultadoMatch) {
        dates.push({
          eventType: 'resultado',
          eventName: 'Resultado Provão Paulista',
          eventDate: this.parseBrDate(resultadoMatch[1]),
        });
      }
    });

    return dates;
  }

  private parseBrDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  private parseBrDateWithYear(dateStr: string, referenceDate: string): string {
    const [day, month] = dateStr.split('/');
    const year = referenceDate.substring(0, 4);
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
