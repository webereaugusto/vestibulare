import { BaseScraper } from './base-scraper';
import { EnemScraper } from './enem';
import { ProvaoPaulistaScraper } from './provao-paulista';
import { ProuniScraper } from './prouni';

export function getAllScrapers(): BaseScraper[] {
  return [
    new EnemScraper(),
    new ProvaoPaulistaScraper(),
    new ProuniScraper(),
  ];
}

export { BaseScraper, EnemScraper, ProvaoPaulistaScraper, ProuniScraper };
