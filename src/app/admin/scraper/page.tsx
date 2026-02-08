'use client';

import { useState } from 'react';
import { Bot, Play, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/toast';
import { ScraperResult } from '@/types/alerts';

export default function AdminScraperPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<ScraperResult[]>([]);
  const { addToast } = useToast();

  async function handleRunScrapers() {
    setRunning(true);
    setResults([]);

    try {
      const response = await fetch('/api/scraper/run', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.error) {
        addToast(data.error, 'error');
      } else {
        setResults(data.results || []);
        addToast(`Scraping concluído! ${data.results?.length || 0} scrapers executados.`, 'success');
      }
    } catch {
      addToast('Erro ao executar scrapers.', 'error');
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scraper</h1>
          <p className="text-gray-500 mt-1">Execute os scrapers manualmente para buscar datas de vestibulares.</p>
        </div>
        <Button onClick={handleRunScrapers} loading={running}>
          {running ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Executando...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" /> Executar Scrapers
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Scrapers Disponíveis</CardTitle>
          <CardDescription>
            Os scrapers buscam automaticamente datas importantes nos sites oficiais dos vestibulares.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { name: 'ENEM', slug: 'enem', url: 'gov.br/inep' },
              { name: 'Provão Paulista', slug: 'provao-paulista', url: 'educacao.sp.gov.br' },
              { name: 'ProUni', slug: 'prouni', url: 'prouniportal.mec.gov.br' },
            ].map((scraper) => {
              const result = results.find((r) => r.vestibularSlug === scraper.slug);
              return (
                <div
                  key={scraper.slug}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <Bot className="h-5 w-5 text-emerald-600" />
                    <div>
                      <p className="font-medium text-gray-900">{scraper.name}</p>
                      <p className="text-xs text-gray-500">{scraper.url}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {result ? (
                      <>
                        <Badge variant={result.errors ? 'warning' : 'success'}>
                          {result.dates.length} datas encontradas
                        </Badge>
                        {result.errors ? (
                          <XCircle className="h-5 w-5 text-amber-500" />
                        ) : (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        )}
                      </>
                    ) : running ? (
                      <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    ) : (
                      <Badge variant="secondary">Aguardando</Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resultados detalhados */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Resultados do Scraping</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {results.map((result) => (
                <div key={result.vestibularSlug} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{result.vestibularSlug}</h3>
                    <span className="text-xs text-gray-500">
                      {new Date(result.scrapedAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  {result.dates.length > 0 ? (
                    <ul className="space-y-1">
                      {result.dates.map((date, i) => (
                        <li key={i} className="text-sm text-gray-600">
                          <Badge variant="secondary" className="mr-2">{date.eventType}</Badge>
                          {date.eventName} - {date.eventDate}
                          {date.eventEndDate && ` até ${date.eventEndDate}`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhuma data encontrada.</p>
                  )}
                  {result.errors && (
                    <div className="mt-2">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-sm text-red-600">{err}</p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
