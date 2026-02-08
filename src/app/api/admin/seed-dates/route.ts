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
}

const DATES_2026_2027: DateEntry[] = [
  // ========== ENEM 2026 ==========
  { vestibularSlug: 'enem', eventType: 'inscricao', eventName: 'Início das Inscrições ENEM 2026', eventDate: '2026-05-25', eventEndDate: '2026-06-05', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'enem', eventType: 'inscricao', eventName: 'Fim das Inscrições ENEM 2026', eventDate: '2026-06-05', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'enem', eventType: 'prova', eventName: '1º Dia de Provas ENEM 2026', eventDate: '2026-11-01', alertDaysBefore: [1, 3, 7, 14, 30] },
  { vestibularSlug: 'enem', eventType: 'prova', eventName: '2º Dia de Provas ENEM 2026', eventDate: '2026-11-08', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'enem', eventType: 'resultado', eventName: 'Divulgação dos Resultados ENEM 2026', eventDate: '2027-01-16', alertDaysBefore: [1, 3, 7] },

  // ========== SiSU 2027 ==========
  { vestibularSlug: 'sisu', eventType: 'inscricao', eventName: 'Início das Inscrições SiSU 2027', eventDate: '2027-01-19', eventEndDate: '2027-01-23', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'sisu', eventType: 'inscricao', eventName: 'Fim das Inscrições SiSU 2027', eventDate: '2027-01-23', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'sisu', eventType: 'resultado', eventName: 'Resultado Chamada Regular SiSU 2027', eventDate: '2027-01-29', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'sisu', eventType: 'matricula', eventName: 'Matrícula Chamada Regular SiSU 2027', eventDate: '2027-02-02', eventEndDate: '2027-02-06', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'sisu', eventType: 'outro', eventName: 'Manifestação Interesse Lista de Espera SiSU 2027', eventDate: '2027-02-11', alertDaysBefore: [1, 3] },

  // ========== FUVEST 2027 ==========
  { vestibularSlug: 'fuvest', eventType: 'outro', eventName: 'Início Solicitação Isenção/Redução FUVEST 2027', eventDate: '2026-05-12', eventEndDate: '2026-07-10', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'fuvest', eventType: 'inscricao', eventName: 'Início das Inscrições FUVEST 2027', eventDate: '2026-08-17', eventEndDate: '2026-10-06', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'fuvest', eventType: 'inscricao', eventName: 'Fim das Inscrições FUVEST 2027', eventDate: '2026-10-06', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'fuvest', eventType: 'prova', eventName: '1ª Fase FUVEST 2027', eventDate: '2026-11-22', alertDaysBefore: [1, 3, 7, 14, 30] },
  { vestibularSlug: 'fuvest', eventType: 'prova', eventName: '2ª Fase FUVEST 2027 - 1º Dia', eventDate: '2026-12-13', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'fuvest', eventType: 'prova', eventName: '2ª Fase FUVEST 2027 - 2º Dia', eventDate: '2026-12-14', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'fuvest', eventType: 'resultado', eventName: 'Resultado 1ª Chamada FUVEST 2027', eventDate: '2027-01-22', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'fuvest', eventType: 'matricula', eventName: 'Matrícula 1ª Chamada FUVEST 2027', eventDate: '2027-01-25', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'fuvest', eventType: 'segunda_chamada', eventName: 'Resultado 2ª Chamada FUVEST 2027', eventDate: '2027-02-09', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'fuvest', eventType: 'segunda_chamada', eventName: 'Resultado 3ª Chamada FUVEST 2027', eventDate: '2027-02-23', alertDaysBefore: [1, 3] },

  // ========== UNICAMP 2027 ==========
  { vestibularSlug: 'unicamp', eventType: 'outro', eventName: 'Início Solicitação Isenção UNICAMP 2027', eventDate: '2026-05-13', eventEndDate: '2026-06-21', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unicamp', eventType: 'inscricao', eventName: 'Início das Inscrições UNICAMP 2027', eventDate: '2026-08-03', eventEndDate: '2026-08-31', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'unicamp', eventType: 'inscricao', eventName: 'Fim das Inscrições UNICAMP 2027', eventDate: '2026-08-31', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unicamp', eventType: 'prova', eventName: '1ª Fase UNICAMP 2027', eventDate: '2026-10-18', alertDaysBefore: [1, 3, 7, 14, 30] },
  { vestibularSlug: 'unicamp', eventType: 'prova', eventName: '2ª Fase UNICAMP 2027 - 1º Dia', eventDate: '2026-12-06', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'unicamp', eventType: 'prova', eventName: '2ª Fase UNICAMP 2027 - 2º Dia', eventDate: '2026-12-07', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unicamp', eventType: 'resultado', eventName: 'Resultado 1ª Chamada UNICAMP 2027', eventDate: '2027-01-24', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unicamp', eventType: 'matricula', eventName: 'Matrícula 1ª Chamada UNICAMP 2027', eventDate: '2027-01-25', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unicamp', eventType: 'segunda_chamada', eventName: 'Resultado 2ª Chamada UNICAMP 2027', eventDate: '2027-02-10', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unicamp', eventType: 'segunda_chamada', eventName: 'Resultado 3ª Chamada UNICAMP 2027', eventDate: '2027-02-20', alertDaysBefore: [1, 3] },

  // ========== UNESP 2027 ==========
  { vestibularSlug: 'unesp', eventType: 'outro', eventName: 'Início Solicitação Isenção/Redução UNESP 2027', eventDate: '2026-08-26', eventEndDate: '2026-09-01', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unesp', eventType: 'inscricao', eventName: 'Início das Inscrições UNESP 2027', eventDate: '2026-09-07', eventEndDate: '2026-10-13', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'unesp', eventType: 'inscricao', eventName: 'Fim das Inscrições UNESP 2027', eventDate: '2026-10-13', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unesp', eventType: 'prova', eventName: '1ª Fase UNESP 2027', eventDate: '2026-11-15', alertDaysBefore: [1, 3, 7, 14, 30] },
  { vestibularSlug: 'unesp', eventType: 'prova', eventName: '2ª Fase UNESP 2027 - 1º Dia', eventDate: '2026-12-13', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'unesp', eventType: 'prova', eventName: '2ª Fase UNESP 2027 - 2º Dia', eventDate: '2026-12-14', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unesp', eventType: 'resultado', eventName: 'Resultado 1ª Chamada UNESP 2027', eventDate: '2027-01-31', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'unesp', eventType: 'matricula', eventName: 'Matrícula 1ª Chamada UNESP 2027', eventDate: '2027-02-01', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unesp', eventType: 'segunda_chamada', eventName: 'Resultado 2ª Chamada UNESP 2027', eventDate: '2027-02-11', alertDaysBefore: [1, 3] },
  { vestibularSlug: 'unesp', eventType: 'segunda_chamada', eventName: 'Resultado 3ª Chamada UNESP 2027', eventDate: '2027-02-21', alertDaysBefore: [1, 3] },

  // ========== UERJ 2027 ==========
  { vestibularSlug: 'uerj', eventType: 'outro', eventName: 'Início Solicitação Isenção 1º EQ UERJ 2027', eventDate: '2026-03-15', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'uerj', eventType: 'inscricao', eventName: 'Início Inscrições 1º EQ UERJ 2027', eventDate: '2026-04-15', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'uerj', eventType: 'prova', eventName: '1º Exame de Qualificação UERJ 2027', eventDate: '2026-06-14', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'uerj', eventType: 'outro', eventName: 'Início Solicitação Isenção 2º EQ UERJ 2027', eventDate: '2026-06-15', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'uerj', eventType: 'inscricao', eventName: 'Início Inscrições 2º EQ UERJ 2027', eventDate: '2026-07-15', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'uerj', eventType: 'prova', eventName: '2º Exame de Qualificação UERJ 2027', eventDate: '2026-08-30', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'uerj', eventType: 'inscricao', eventName: 'Início Inscrições Exame Discursivo UERJ 2027', eventDate: '2026-09-15', alertDaysBefore: [1, 3, 7] },
  { vestibularSlug: 'uerj', eventType: 'prova', eventName: 'Exame Discursivo UERJ 2027', eventDate: '2026-11-29', alertDaysBefore: [1, 3, 7, 14] },
  { vestibularSlug: 'uerj', eventType: 'resultado', eventName: 'Resultado Final UERJ 2027', eventDate: '2027-01-25', alertDaysBefore: [1, 3, 7] },
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
