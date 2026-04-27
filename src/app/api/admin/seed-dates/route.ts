import { NextResponse } from 'next/server';
import { getProfile } from '@/lib/supabase-server';
import { createServiceClient } from '@/lib/supabase';
import { Profile } from '@/types/database';

interface DateEntry {
  vestibularSlug: string;
  eventType: string;
  eventName: string;
  eventDate: string;
  eventEndDate?: string;
  alertDaysBefore?: number[];
  officialUrl?: string;
  notes?: string;
}

const DATES_2026_2027: DateEntry[] = [
  // Datas oficiais coletadas em fontes primárias (Inep, MEC, Comvest, FUVEST, VUNESP e UERJ)
  // em 26/04/2026.
  // ========== ENEM 2026 ==========
  {
    vestibularSlug: 'enem',
    eventType: 'outro',
    eventName: 'Justificativa de ausência / Solicitação de isenção ENEM 2026',
    eventDate: '2026-04-13',
    eventEndDate: '2026-04-24',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/enem-2026-comeca-nesta-segunda-feira-13-de-abril-o-prazo-para-solicitar-a-isencao-da-taxa-de-inscricao',
  },
  {
    vestibularSlug: 'enem',
    eventType: 'inscricao',
    eventName: 'Inscrições ENEM 2026',
    eventDate: '2026-05-26',
    eventEndDate: '2026-06-06',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/inscricoes-comecam-na-proxima-segunda-26',
  },
  {
    vestibularSlug: 'enem',
    eventType: 'prova',
    eventName: '1º dia de provas ENEM 2026',
    eventDate: '2026-11-09',
    alertDaysBefore: [1, 3, 7, 14, 30],
    officialUrl: 'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/inscricoes-comecam-na-proxima-segunda-26',
  },
  {
    vestibularSlug: 'enem',
    eventType: 'prova',
    eventName: '2º dia de provas ENEM 2026',
    eventDate: '2026-11-16',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.gov.br/inep/pt-br/centrais-de-conteudo/noticias/enem/inscricoes-comecam-na-proxima-segunda-26',
  },

  // ========== SiSU 2026 ==========
  {
    vestibularSlug: 'sisu',
    eventType: 'inscricao',
    eventName: 'Inscrições SiSU 2026',
    eventDate: '2026-01-19',
    eventEndDate: '2026-01-23',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.gov.br/mec/pt-br/assuntos/noticias/2026/janeiro/abertas-as-inscricoes-para-o-sisu-2026',
  },
  {
    vestibularSlug: 'sisu',
    eventType: 'resultado',
    eventName: 'Resultado da chamada regular SiSU 2026',
    eventDate: '2026-01-29',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.gov.br/mec/pt-br/assuntos/noticias/2026/janeiro/abertas-as-inscricoes-para-o-sisu-2026',
  },
  {
    vestibularSlug: 'sisu',
    eventType: 'outro',
    eventName: 'Manifestação de interesse na lista de espera SiSU 2026 (até)',
    eventDate: '2026-02-02',
    alertDaysBefore: [1, 3],
    officialUrl: 'https://www.gov.br/mec/pt-br/assuntos/noticias/2026/janeiro/sisu-2026-resultados-individuais-estao-disponiveis',
  },

  // ========== FUVEST 2026 ==========
  {
    vestibularSlug: 'fuvest',
    eventType: 'inscricao',
    eventName: 'Inscrições FUVEST 2026',
    eventDate: '2025-08-18',
    eventEndDate: '2025-10-07',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.fuvest.br/fuvest-2026-fuvest-divulga-cronograma-para-vestibular-2026/',
  },
  {
    vestibularSlug: 'fuvest',
    eventType: 'prova',
    eventName: '1ª fase FUVEST 2026',
    eventDate: '2025-11-23',
    alertDaysBefore: [1, 3, 7, 14, 30],
    officialUrl: 'https://www.fuvest.br/fuvest-2026-fuvest-divulga-cronograma-para-vestibular-2026/',
  },
  {
    vestibularSlug: 'fuvest',
    eventType: 'prova',
    eventName: '2ª fase FUVEST 2026 - 1º dia',
    eventDate: '2025-12-14',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.fuvest.br/fuvest-2026-fuvest-divulga-cronograma-para-vestibular-2026/',
  },
  {
    vestibularSlug: 'fuvest',
    eventType: 'prova',
    eventName: '2ª fase FUVEST 2026 - 2º dia',
    eventDate: '2025-12-15',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.fuvest.br/fuvest-2026-fuvest-divulga-cronograma-para-vestibular-2026/',
  },
  {
    vestibularSlug: 'fuvest',
    eventType: 'resultado',
    eventName: 'Divulgação da 1ª chamada FUVEST 2026',
    eventDate: '2026-01-23',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.fuvest.br/fuvest-2026-fuvest-divulga-cronograma-para-vestibular-2026/',
  },

  // ========== UNICAMP 2027 ==========
  {
    vestibularSlug: 'unicamp',
    eventType: 'outro',
    eventName: 'Solicitação de isenção UNICAMP 2027',
    eventDate: '2026-05-11',
    eventEndDate: '2026-06-05',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'outro',
    eventName: 'Divulgação da lista de beneficiados pela isenção UNICAMP 2027',
    eventDate: '2026-07-31',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'inscricao',
    eventName: 'Inscrições UNICAMP 2027',
    eventDate: '2026-08-03',
    eventEndDate: '2026-08-31',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'prova',
    eventName: '1ª fase UNICAMP 2027',
    eventDate: '2026-10-18',
    alertDaysBefore: [1, 3, 7, 14, 30],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'prova',
    eventName: '2ª fase UNICAMP 2027 - 1º dia',
    eventDate: '2026-11-29',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'prova',
    eventName: '2ª fase UNICAMP 2027 - 2º dia',
    eventDate: '2026-11-30',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'resultado',
    eventName: 'Divulgação da 1ª lista de aprovados UNICAMP 2027',
    eventDate: '2027-01-25',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },
  {
    vestibularSlug: 'unicamp',
    eventType: 'matricula',
    eventName: 'Matrícula online da 1ª lista UNICAMP 2027',
    eventDate: '2027-01-26',
    eventEndDate: '2027-01-27',
    alertDaysBefore: [1, 3],
    officialUrl: 'https://www.unicamp.br/noticias/2026/03/30/unicamp-divulga-datas-do-vestibular-2027-inscricoes-serao-realizadas-de-3-a-31-de-agosto/',
  },

  // ========== UNESP (meio de ano) 2026 ==========
  {
    vestibularSlug: 'unesp',
    eventType: 'inscricao',
    eventName: 'Inscrições UNESP Meio de Ano 2026',
    eventDate: '2026-04-13',
    eventEndDate: '2026-05-05',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.vunesp.com.br/VNSP2513',
  },
  {
    vestibularSlug: 'unesp',
    eventType: 'prova',
    eventName: '1ª fase UNESP Meio de Ano 2026',
    eventDate: '2026-05-24',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.vunesp.com.br/VNSP2513',
  },
  {
    vestibularSlug: 'unesp',
    eventType: 'prova',
    eventName: '2ª fase UNESP Meio de Ano 2026 - 1º dia',
    eventDate: '2026-06-20',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.vunesp.com.br/VNSP2513',
  },
  {
    vestibularSlug: 'unesp',
    eventType: 'prova',
    eventName: '2ª fase UNESP Meio de Ano 2026 - 2º dia',
    eventDate: '2026-06-21',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.vunesp.com.br/VNSP2513',
  },

  // ========== UERJ 2027 (datas publicadas para o 1º EQ) ==========
  {
    vestibularSlug: 'uerj',
    eventType: 'inscricao',
    eventName: 'Prazo final de inscrição - 1º Exame de Qualificação UERJ 2027',
    eventDate: '2026-05-06',
    alertDaysBefore: [1, 3, 7],
    officialUrl: 'https://www.uerj.br/noticia/vestibular-uerj-2027-inscricoes-para-1o-exame-de-qualificacao-vao-ate-6-5-prova-sera-aplicada-em-junho/',
  },
  {
    vestibularSlug: 'uerj',
    eventType: 'outro',
    eventName: 'Prazo final para pagamento da taxa - 1º EQ UERJ 2027',
    eventDate: '2026-05-07',
    alertDaysBefore: [1, 3],
    officialUrl: 'https://www.uerj.br/noticia/vestibular-uerj-2027-inscricoes-para-1o-exame-de-qualificacao-vao-ate-6-5-prova-sera-aplicada-em-junho/',
  },
  {
    vestibularSlug: 'uerj',
    eventType: 'prova',
    eventName: '1º Exame de Qualificação UERJ 2027',
    eventDate: '2026-06-07',
    alertDaysBefore: [1, 3, 7, 14],
    officialUrl: 'https://www.uerj.br/noticia/vestibular-uerj-2027-inscricoes-para-1o-exame-de-qualificacao-vao-ate-6-5-prova-sera-aplicada-em-junho/',
  },
];

export async function POST() {
  try {
    const profile = (await getProfile()) as Profile | null;
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 403 });
    }

    const supabase = createServiceClient();

    // Buscar todos os vestibulares por slug
    const { data: vestibulares } = await supabase
      .from('vestibulares')
      .select('id, slug');

    if (!vestibulares) {
      return NextResponse.json({ error: 'Nenhum vestibular encontrado' }, { status: 500 });
    }

    const slugToId = new Map(vestibulares.map((v) => [v.slug, v.id]));
    // O usuário solicitou limpar todas as datas existentes antes de inserir o novo calendário.
    await supabase
      .from('important_dates')
      .delete()
      .not('id', 'is', null);

    let inserted = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of DATES_2026_2027) {
      const vestibularId = slugToId.get(entry.vestibularSlug);
      if (!vestibularId) {
        errors.push(`Vestibular não encontrado: ${entry.vestibularSlug}`);
        skipped++;
        continue;
      }

      const { error } = await supabase
        .from('important_dates')
        .upsert(
          {
            vestibular_id: vestibularId,
            event_type: entry.eventType,
            event_name: entry.eventName,
            event_date: entry.eventDate,
            event_end_date: entry.eventEndDate || null,
            official_url: entry.officialUrl || null,
            notes: entry.notes || null,
            alert_days_before: entry.alertDaysBefore || [1, 3, 7],
            source: 'manual',
          },
          {
            onConflict: 'vestibular_id,event_type,event_date',
            ignoreDuplicates: true,
          }
        );

      if (error) {
        // Se der conflito, tenta insert normal (pode ser combinação diferente)
        const { error: insertError } = await supabase
          .from('important_dates')
          .insert({
            vestibular_id: vestibularId,
            event_type: entry.eventType,
            event_name: entry.eventName,
            event_date: entry.eventDate,
            event_end_date: entry.eventEndDate || null,
            official_url: entry.officialUrl || null,
            notes: entry.notes || null,
            alert_days_before: entry.alertDaysBefore || [1, 3, 7],
            source: 'manual',
          });

        if (insertError) {
          skipped++;
        } else {
          inserted++;
        }
      } else {
        inserted++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${inserted} datas inseridas, ${skipped} ignoradas`,
      total: DATES_2026_2027.length,
      inserted,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Erro ao semear datas:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro interno',
    }, { status: 500 });
  }
}
