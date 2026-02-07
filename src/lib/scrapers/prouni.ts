import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedDate } from '@/types/alerts';

export class ProuniScraper extends BaseScraper {
  vestibularSlug = 'prouni';
  scrapeUrl = 'https://prouniportal.mec.gov.br';

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

    // Buscar cronograma/calendário na página
    $('table, div.cronograma, div.calendario, div.content, article').each((_, element) => {
      const text = $(element).text();

      // Inscrições
      const inscricaoMatch = text.match(
        /inscri[çc][õo]es?\s*(?:de|:)?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|até|à)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (inscricaoMatch) {
        dates.push({
          eventType: 'inscricao',
          eventName: 'Inscrições ProUni',
          eventDate: this.parseBrDate(inscricaoMatch[1]),
          eventEndDate: this.parseBrDate(inscricaoMatch[2]),
        });
      }

      // Resultado primeira chamada
      const resultado1Match = text.match(
        /(?:resultado|1[ªa]\s*chamada)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (resultado1Match) {
        dates.push({
          eventType: 'resultado',
          eventName: 'Resultado 1ª Chamada ProUni',
          eventDate: this.parseBrDate(resultado1Match[1]),
        });
      }

      // Segunda chamada
      const resultado2Match = text.match(
        /2[ªa]\s*chamada\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (resultado2Match) {
        dates.push({
          eventType: 'segunda_chamada',
          eventName: 'Resultado 2ª Chamada ProUni',
          eventDate: this.parseBrDate(resultado2Match[1]),
        });
      }

      // Matrícula
      const matriculaMatch = text.match(
        /matr[ií]cula\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|até|à)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (matriculaMatch) {
        dates.push({
          eventType: 'matricula',
          eventName: 'Matrícula ProUni',
          eventDate: this.parseBrDate(matriculaMatch[1]),
          eventEndDate: this.parseBrDate(matriculaMatch[2]),
        });
      }
    });

    return dates;
  }

  private parseBrDate(dateStr: string): string {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
}
