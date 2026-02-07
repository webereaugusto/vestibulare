import * as cheerio from 'cheerio';
import { BaseScraper } from './base-scraper';
import { ScrapedDate } from '@/types/alerts';

export class EnemScraper extends BaseScraper {
  vestibularSlug = 'enem';
  scrapeUrl = 'https://www.gov.br/inep/pt-br/areas-de-atuacao/avaliacao-e-exames-educacionais/enem';

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

    // Buscar por padrões comuns de datas no site do INEP
    // Os seletores podem precisar de ajustes conforme mudanças no site
    $('div.content-area, div.documentContent, article').each((_, element) => {
      const text = $(element).text();

      // Padrão: "Inscrições: XX/XX/XXXX a XX/XX/XXXX"
      const inscricaoMatch = text.match(
        /inscri[çc][õo]es?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*(?:a|até|à)\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (inscricaoMatch) {
        dates.push({
          eventType: 'inscricao',
          eventName: 'Inscrições ENEM',
          eventDate: this.parseBrDate(inscricaoMatch[1]),
          eventEndDate: this.parseBrDate(inscricaoMatch[2]),
        });
      }

      // Padrão: "Provas: XX e XX de mês" ou "Aplicação: XX/XX/XXXX"
      const provaMatch = text.match(
        /(?:provas?|aplica[çc][ãa]o)\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (provaMatch) {
        dates.push({
          eventType: 'prova',
          eventName: 'Prova ENEM - 1º Dia',
          eventDate: this.parseBrDate(provaMatch[1]),
        });
      }

      // Padrão: "Resultado: XX/XX/XXXX"
      const resultadoMatch = text.match(
        /resultado\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
      );
      if (resultadoMatch) {
        dates.push({
          eventType: 'resultado',
          eventName: 'Resultado ENEM',
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
}
